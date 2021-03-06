'use strict'

const conn = {
  host: '104.131.43.30',
  // host: 'localhost',
  port: 28015,
  // user: 'm3pscl0ud',
  db: 'mepscloud',
}

const sg = require('sendgrid')('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')
const footer = `<div style='padding: 1em; background-color: #f1f1f1; color:#b3b3b1; border-top: 1px solid #e5e5e5; margin: 0; text-align: center; font-family: sans-serif;'>
    <p>
      Enviado a través de
      <a
        href='https://mepscloud.com''
        target='_blank''
        style='color:#8e8e8e;'>
        mepscloud.com
      </a>
    </p>
  </div>`

  function parseDate () {
    function pad(s) { return (s < 10) ? '0' + s : s }
    var d = new Date()
    return [pad(d.getDate()), pad(d.getMonth()+1), d.getFullYear()].join('/')
  }
const  r = require('rethinkdbdash')(conn)
export default {
 async sendSingle (efrom, template, subject , to) {
   console.log(subject)
   console.log('to', to)
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
        'personalizations': to
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
 async sendMultiple (campaingId, count) {

  let campaing = await r.db('mepscloud').table('campaingEmails').get(campaingId)
  let template = await r.db('mepscloud').table('templateEmails').get(campaing.templateId)
  let user = await r.db('mepscloud').table('users').get(campaing.userId)
  if (user.balanceEmail >= count ) {
    try {
      console.log('descontar', count)
      await r.db('mepscloud').table('users').get(user.id).update({balanceEmail: r.row("balanceEmail").add(- count)})
    } catch (e) {
      console.log(`error al descontar ${e.message}`)
    }
    template.template = template.template + footer
    let perRequest = 1000
    let ciclos = parseInt((count / perRequest) + 1)
    let request = []
    for (let i = 0; i < ciclos; i++ ) {
      let skip = i * 1000
      let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'}).skip(skip).limit(1000)
      if (contacts.length > 0) {
        let personalizations = []
        let history = []
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
            personalizations.push({
              'to':[{'email': contacts[j].email}],
              'substitutions':{
                "#{nombre}": name,
                "#{apellido}": lastName
              },
              'custom_args': {'campaingId': campaing.id}
            })
            history.push({
              email: contacts[j].email,
              event: 'sending',
              campaingId: campaing.id,
              userId: user.id,
              sendAt: ((new Date().getTime()) / 1000.0),
              date: ((new Date().getTime()) / 1000.0),
              customDate: parseDate(),
              hour: new Date().getHours()

            })
          } else  {
              try {
                await r.db('mepscloud').table('users').get(user.id).update({balanceEmail: r.row("balanceEmail").add(1)})
              } catch (e) {
                console.error(`no se le pudo devolver el saldo debido al siguiente error: ${e.message}`)
              }
          }
        }
         request.push(this.makeRequest(campaing.from, campaing.nameSender, campaing.subject, template.template, personalizations, user.id, history))
      }
    }
    await Promise.all(request)
    return Promise.resolve('sended')
  } else {
    return Promise.reject('no tienes saldo suficiente ')
  }
 },
 async makeRequest (from, sender, subject, template, personalizations, userId, history) {
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
    let self = this
     sg.API(request).then(function (response) {
       self.saveHistory(history)
     })
     .catch(function (err) {
       console.error(err.response.body.errors)
       r.db('mepscloud').get(userId).update({
         balanceEmail: r.row("balanceEmail").add(history.length)
       }).then(() => (true))
       .catch((err) => { console.error (err.message)})
     })
 },
 async saveHistory (history) {
  await r.db('mepscloud').table('historicEmail').insert(history)
  return true
 },
}
