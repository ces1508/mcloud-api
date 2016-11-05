'use strict'
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY || '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')
const r = require('rethinkdb')
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

  let campaing = await r.db('mepscloud').table('campaingemails').get(campaingId).run(conn)
  let template = await r.db('mepscloud').table('templateEmails').get(campaing.templateId).run(conn)
  let count = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'})
    .count().run(conn)
  let perRequest = 1000
  let ciclos = parseInt((countContacts / perRequest) + 1)
  for (let i = 0; i < ciclos; i++ ) {
    let contacts = await r.db('mepscloud').table('contacts').getAll(campaingId.databaseId, {index: 'databaseId'})
      .run(conn)
    contacts = await contacts.toArray()
    let request = []
    if (contacts.length > 0) {
      let personalizations = []
      eachAsync(contacts, (item, index, done) => {
        let text = campaing.template
        let name = item.firstName || ''
        name = name.split(' ', 1)
        name =  name ? name[0] : ''
        let lastName = item.lastName || ''
        lastName = lastName.split(' ', 1)
        lastName = lastName ? lastName[0]: ''
        personalizations.push({
          to:[{email: item.email}],
          substitutions:{
            "#{nombre}": name,
            "#{apellido}": lastName
          },
          custom_args: {'campaingId': campaing.id}
        })
        done()
      })
      request.push(this.makeRequest(campaing.from, campaing.subject, template.template, personalizations))
    }
  }
  await Promise.all(request)
  return Promise.resolve('sended')
 },
 async makeRequest (from, subject, template, personalizations) {
   let request = sg.emptyRequest()
    request.body = {
      'from':{'email':from},
      'subject':subject,

      'content':[{
        'type':'text/html',
        'value':template
      }],
      'personalizations':personalizations
    }
    await sg.API(request)
 }
}
