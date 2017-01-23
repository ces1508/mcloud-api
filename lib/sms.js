import request from 'request-promise'
import eachAsync from 'each-async'
import sleep from 'then-sleep'
const r = require('rethinkdbdash')({
  host: '104.131.43.30',
  port:'28015'
})
import slee from 'then-sleep'

export default {
  async send (campaingId, userId) {

    let campaing = null
    try {
      campaing = await r.db('mepscloud').table('campaingSms').get(campaingId)
      let countContacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'}).count()
      let user = await r.db('mepscloud').table('users').get(userId)
      let priceBySms = await r.db('mepscloud').table('smsPlans').get(user.smsPlanId)
      let priceCampaign = (priceBySms.price * countContacts )

      if (user.balanceSms >= priceCampaign) {
        let newBalance = (user.balanceSms - priceCampaign)
        await r.db('mepscloud').table('users').get(user.id).update({balanceSms: newBalance})
        let perRequest = 300
        let ciclos = parseInt((countContacts / perRequest) + 1)
        if (countContacts < 90000 ) {
          for (let i = 0; i < ciclos; i++) {
            let numbers = []
            let history = []
            let skip = i * perRequest
            let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId,
              {index: 'databaseId'}).skip(skip).limit(perRequest)
              for (let j = 0; j < contacts.length; j ++) {
                if ((contacts[j].phone) && (contacts[j].phone.toString().length === 10)) {
                  numbers.push(`57${contacts[j].phone}`)
                  history.push({
                    phone: contacts[j].phone,
                    firstName: contacts[j].firstName || '',
                    lastName: contacts[j].lastName || '',
                    campaingId: campaingId,
                    status: null,
                    userId: userId,
                    date: new Date()
                  })
                } else {
                  user = await r.db('mepscloud').table('users').get(userId)
                  let sum = (priceBySms.price + user.balanceSms)
                  await r.db('mepscloud').table('users').get(user.id).update({balanceSms: sum})
                }

              }
              if (numbers.length > 0) {
                await this.makeRequest(numbers, '3203230522', campaing.template, history)
              }
            }
          }
        return Promise.resolve('campaña enviada')
      } else {
        return Promise.reject(new Error('no tiene saldo suficiente para enviar esta campaña'))
      }
    } catch (e) {
      console.error(`error al traer la campaña ${e.message}`)
    }
  },
  async sendCustom (campaingId, userId) {
    let campaing = null
    try {
      console.log('entro al sendCustom')
      campaing = await r.db('mepscloud').table('campaingSms').get(campaingId)
      let countContacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'}).count()
      let user = await r.db('mepscloud').table('users').get(userId)
      let priceBySms = await r.db('mepscloud').table('smsPlans').get(user.smsPlanId)
      let priceCampaign = (priceBySms.price * countContacts )
    if (user.balanceSms >= priceCampaign) {
      let newBalance = (user.balanceSms - priceCampaign)
      await r.db('mepscloud').table('users').get(user.id).update({balanceSms: newBalance})
      let perRequest = 200
      let ciclos = parseInt((countContacts / perRequest) + 1)
      for (let i = 0; i < ciclos; i++) {
        let skip = i * perRequest
        let data = null
        let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId,
          {index: 'databaseId'}).skip(skip).limit(perRequest)
          console.log(contacts.length)
        let self = this
        let history = []
        for (let j = 0; j < contacts.length; j ++) {
          let text = campaing.template
          let name = contacts[j].firstName || ''
          name = name.split(' ', 1)
          name =  name ? name[0] : ''
          let lastName = contacts[j].lastName || ''
          lastName = lastName.split(' ', 1)
          lastName = lastName ? lastName[0]: ''
          text = text.replace(/#{nombre}/g, name)
          text = text.replace(/#{apellido}/g, lastName)
          if (contacts[j].phone) {
            if (contacts[j].phone.toString().length === 10) {
              let number = [`57${contacts[j].phone}`]
              if (text.length <= 160) {
                let options = {
                  method: 'POST',
                  uri: 'https://gateway.plusmms.net/rest/message',
                  headers: {
                    'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA='
                  },
                  resolveWithFullResponse: true,
                  json: true,
                  body: {
                    to: number,
                    text: text,
                    tresc: 'true',
                    from: '3203230522'
                  }
                }
                let newHistory = {
                  phone: contacts[j].phone,
                  firstName: contacts[j].firstName || ' ',
                  lastName: contacts[j].lastName || ' ',
                  campaingId: campaingId,
                  status: null,
                  userId: userId,
                  date: new Date()
                }

                await sleep(16)
                try {
                  request(options)
                  newHistory.status = 'send'
                  console.log(newHistory)
                } catch (e) {
                  newHistory.status = 'failed'
                }
                history.push(newHistory)
              }
            } else {
              await self.sumSaldo(1, userId)
            }
          }
        }
        console.log(i)
        console.log(history.length)
        await self.saveHistory(history)
      }
    } else {
       return Promise.reject(new Error('no tienes saldo suficiente para enviar esta campaña'))
      }
    } catch (e) {
      console.error(e)
    }
  },
  async sendTest (text, from, numbers) {

    let options = {
      method: 'POST',
      uri: 'https://gateway.plusmms.net/rest/message',
      headers: {
        'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA='
      },
      resolveWithFullResponse: true,
      json: true,
      body: {
        to: numbers,
        text: text,
        tresc: 'true',
        from: from
    }
  }
  return Promise.resolve(request(options))
  },
  async makeRequest (numbers, from, text, history) {
    await sleep(20)
    let options = {
      method: 'POST',
      uri: 'https://gateway.plusmms.net/rest/message',
      headers: {
        'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA='
      },
      resolveWithFullResponse: true,
      json: true,
      body: {
        to: numbers,
        text: text,
        tresc: true,
        from: from
      }
    }
    let self = this
    request(options)
    .then((response, body) => {
      for (let i = 0; i < history.length; i++) {
        history[i].status = 'send'
      }
        self.saveHistory(history)
    })
    .catch ((err) => {
      console.error(message)
      for (let i = 0; i < history.length; i++) {
        history[i].status = 'failed'
      }
      self.sumSaldo(history.length, history[0].userId)
       self.saveHistory(history)
    })
  },

  async saveHistory (history) {
    let user = history[0].userId
    let id = history[0].campaingId
    let date = Math.round(new Date().getTime()/1000.0)
    await r.db('mepscloud').table('historicSms').insert(history)
    let send =  await r.db('mepscloud').table('historicSms').getAll(id, {index: 'campaingId'}).filter({status: 'send'}).count()
    let failed = await r.db('mepscloud').table('historicSms').getAll(id, {index: 'campaingId'}).filter({status: 'failed'}).count()
    let flag = await r.db('mepscloud').table('statistics').filter({campaingId: id}).isEmpty()
    let statics = await r.db('mepscloud').table('statistics').filter({campaingId: id})
    statics =  statics[0]
    await r.db('mepscloud').table('statistics').get(statics.id).update({
      send: send,
      failed: failed,
      date: date
    })
   },

   async sumSaldo (cant , userId) {
     let user = await r.db('mepscloud').table('users').get(userId)
     let priceBysms = await r.db('mepscloud').table('smsPlans').get(user.smsPlanId)
     let totalsum = ((cant * priceBysms.price) + user.balanceSms)
     await r.db('mepscloud').table('users').get(userId).update({balanceSms: totalsum})
   }
}
