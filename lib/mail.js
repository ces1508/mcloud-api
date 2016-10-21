'use strict'
const sg = require('sendgrid')(process.env.SENDGRID_API_KEY || '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')

export default {
 async send (efrom, template, subject , to) {
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
 }
}
