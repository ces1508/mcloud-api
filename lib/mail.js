'use strict'
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY || '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')
import r from 'rethinkdb'
import eachAsync from 'each-async'
export default {
 async sendSingle (efrom, template, subject , to) {
   return new Promise(function(resolve, reject){
    let request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
      })
      request.body = {
        'from':{email: efrom},
        'subject':subject,
        'content':[{
          'type':'text/html',
          'value': template
        }],
        'personalizations':to
      }
      sg.API(request)
      .then((response) => {
        return resolve({
          body: response.body,
          status: response.statusCode
        })
      })
      .catch((err) => {
        console.log(err)
        return reject(err)
      })
   })
 },
 async sendMultiple (campaingId) {
  let conn = await r.connect({
    host: '104.131.43.30',
    port: 28015
  })

  let campaing = await r.db('mepscloud').table('campaingEmails').get(campaingId).run(conn)
  let template = await r.db('mepscloud').table('templateEmails').get(campaing.templateId).run(conn)
  let user = await r.db('mepscloud').table('users').get(campaing.userId).run(conn)
  let planEmail = await r.db('mepscloud').table('emailPlans').get(user.emailPlanId).run(conn)
  let count = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'})
    .count().run(conn)
  let priceCampaign = (planEmail.price * count)
  if (priceCampaign <= user.balanceEmail ) {
    console.log('precio de campaña', priceCampaign)
    let discount = (user.balanceEmail - priceCampaign)
    try {
      console.log('descontar', discount)
       await r.db('mepscloud').table('users').get(template.userId).update({balanceEmail: discount}).run(conn)
    } catch (e) {
      console.log(`error al descontar ${e.message}`)
    }
    let perRequest = 1000
    let ciclos = parseInt((count / perRequest) + 1)
    let request = []
    for (let i = 0; i < ciclos; i++ ) {
      let skip = i * 1000
      let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'})
      .skip(skip).limit(1000).run(conn)
      contacts = await contacts.toArray()
      if (contacts.length > 0) {
        let personalizations = []
        for (let j = 0; j  < contacts.length; j++) {
          let text = campaing.template
          let name = contacts[j].firstName || ''
          name = name.split(' ', 1)
          name =  name ? name[0] : ''
          let lastName = contacts[j].lastName || ''
          lastName = lastName.split(' ', 1)
          lastName = lastName ? lastName[0]: ''
          // console.log(contacts[j])
          if (contacts[j].email) {
            try {
              if (contacts[j].email.search(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,4})+$/) != -1 ) {
                personalizations.push({
                  'to':[{'email': contacts[j].email}],
                  'substitutions':{
                    "#{nombre}": name,
                    "#{apellido}": lastName
                  },
                  'custom_args': {'campaingId': campaing.id}
                })
              } else {
                console.log('no es un correo valido')
                console.log('precion por email', planEmail.price)
                let balance = (planEmail.price + user.balanceEmail)
                console.log('saldo sera', balance)
                await r.db('mepscloud').table('users').get(user.id).update({balanceEmail: balance}).run(conn)
              }
            } catch (e) {
              console.error(e.message)
            }
          } else  {
             console.log('precion por email', planEmail.price)
            let balance = (planEmail.price + user.balanceEmail)
            console.log('incrementando a ', balance)
            await r.db('mepscloud').table('users').get(user.id).update({balanceEmail: balance}).run(conn)
          }
        }
        request.push(this.makeRequest(campaing.from, campaing.nameSender, campaing.subject, template.template, personalizations, user.id, planEmail.price))
      }
    }
    await Promise.all(request)
    return Promise.resolve('sended')
  } else {
    return Promise.reject('no tienes saldo suficiente ')
  }
 },
 async makeRequest (from, sender, subject, template, personalizations, userId, price) {
   console.log(personalizations.to)
   let request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
    })
    request.body = {
      'from':{
        'email':from,
        'name': sender
      },
      'subject':subject,

      'content':[{
        'type':'text/html',
        'value':template
      }],
      'personalizations':personalizations
    }
     sg.API(request).then(function (response) {
     })
     .catch(function (err) {
       console.error(err.response.body.errors)
        r.connect({host: '104.131.43.30', port: 28015}, function (err, conn) {
          if (err) {
            console.log(err)
          }
          r.db('mepscloud').table('users').get(userId).run(conn, function (err, user) {
            if (err) {
              console.error(err)
            }
            let  balance = ((personalizations.length * price) + user.balanceEmail)
            r.db('mepscloud').table('users').get(userId).update({balanceEmail: balance}).run(conn, function (err, data) {
              if (err) throw err
              console.log('incrementado saldo')
            })
          })

       })
     })
 }
}
