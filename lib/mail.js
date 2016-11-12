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
    host: 'localhost',
    port: 28015
  })

  let campaing = await r.db('mepscloud').table('campaingEmails').get(campaingId).run(conn)
  let template = await r.db('mepscloud').table('templateEmails').get(campaing.templateId).run(conn)
  let count = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'})
    .count().run(conn)
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
        personalizations.push({
          'to':[{'email': contacts[j].email}],
          'substitutions':{
            "#{nombre}": name,
            "#{apellido}": lastName
          },
          'custom_args': {'campaingId': campaing.id}
        })
      }
      request.push(this.makeRequest(campaing.from, campaing.nameSender, campaing.subject, template.template, personalizations))
    }
  }
  await Promise.all(request)
  return Promise.resolve('sended')
 },
 async makeRequest (from, sender, subject, template, personalizations) {
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
       console.error(err)
     })
 }
}
