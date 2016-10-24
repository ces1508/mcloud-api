import request from 'request-promise'
import r from 'rethinkdb'
import eachAsync from 'each-async'
export default {
  async dbConnect () {
    let conn = await r.connect({
      host: 'localhost',
      port:'28015'
    })
    return Promise.resolve(conn)
  },
  async send (campaingId) {
    let conn = await r.connect({
      host: 'localhost',
      port:'28015'
    })
    let campaing = null
    try {
      campaing = await r.db('mepscloud').table('campaingSms').get(campaingId).run(conn)
      let countContacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'}).count().run(conn)
      let perRequest = 300
      let ciclos = parseInt((countContacts / perRequest) + 1)
      if (countContacts < 90000 ) {
        for (let i = 0; i < ciclos; i++) {
          let numbers = []
          let history = []
          let skip = i * perRequest
          let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId,
            {index: 'databaseId'}).skip(skip).limit(perRequest).run(conn)
            contacts = await contacts.toArray()
            for (let j = 0; j < contacts.length; j ++) {
              if (contacts[j].phone.toString().length === 10) {
                numbers.push(`57${contacts[j].phone}`)
                history.push({
                  phone: contacts[j].phone,
                  firstName: contacts[j].firstName || ' ',
                  lastName: contacts[j].lastName,
                  campaingId: campaingId,
                  status: null,
                  date: new Date()
                })
              }
            }
            if (numbers.length > 0) {
              await this.makeRequest(numbers, '3203230522', campaing.template, history)
            }
         }
       }
      return Promise.resolve('campaña enviada')
    } catch (e) {
      console.error(`error al traer la campaña ${e.message}`)
    }
  },
  async sendCustom (campaingId) {
    let conn = await r.connect({
      host: 'localhost',
      port:'28015'
    })
    let campaing = null
    try {
      campaing = await r.db('mepscloud').table('campaingSms').get(campaingId).run(conn)
      let countContacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId, {index: 'databaseId'}).count().run(conn)
      let perRequest = 200
      let ciclos = parseInt((countContacts / perRequest) + 1)
      for (let i = 0; i < ciclos; i++) {
        let skip = i * perRequest
        let data = null
        let contacts = await r.db('mepscloud').table('contacts').getAll(campaing.databaseId,
          {index: 'databaseId'}).orderBy(r.asc('firstName')).skip(skip).limit(perRequest).run(conn)
        contacts = await contacts.toArray()
        let self = this
        eachAsync(contacts, (item, index, done) => {
          let text = campaing.template
          let name = item.firstName || ''
          name = name.split(' ', 1)
          name =  name ? name[0] : ''
          let lastName = item.lastName || ''
          lastName = lastName.split(' ', 1)
          lastName = lastName ? lastName[0]: ''
          text = text.replace(/#{nombre}/g, name)
          text = text.replace(/#{apellido}/g, lastName)
          if ((item.phone) && (item.phone.toString().length === 10)) {
            let number = [`57${item.phone}`]
            let history = {
              phone: item.phone,
              firstName: item.firstName || ' ',
              lastName: item.lastName || ' ',
              campaingId: campaingId,
              status: null,
              date: new Date()
            }
            if (text.length <= 160) {
              let options = {
                method: 'POST',
                uri: 'https://gateway.plusmms.net/rest/message',
                headers: {
                'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA=a'
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
              request(options)
              .then((response, body) => {
                history.status = 'send'
                self.saveHistory(history)
                done()
              })
              .catch((e) => {
                history.status = 'failed'
                self.saveHistory(history)
              })
            }
          }
        },(err) => {
          if (err) {
            console.log(err.message)
          } else {
            console.log('finished')
          }
        })
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
        'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA=a'
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
    let options = {
      method: 'POST',
      uri: 'https://gateway.plusmms.net/rest/message',
      headers: {
        'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA=a'
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
    let self = this
    request(options)
    .then((response, body) => {
      for (let i = 0; i < history.length; i++) {
        history[i].status = 'send'
      }
        self.saveHistory(history)
    })
    .catch ((err) => {
      for (let i = 0; i < history.length; i++) {
        history[i].status = 'failed'
      }
       self.saveHistory(history)
    })
  },
  async requestForCustom (number, from, text, history) {
    let options = {
      method: 'POST',
      uri: 'https://gateway.plusmms.net/rest/message',
      headers: {
        'authorization': 'Basic bWVwc2Nsb3VkY286TUVQJCQ5MDA=a'
      },
      resolveWithFullResponse: true,
      json: true,
      body: {
        to: number,
        text: text,
        tresc: 'true',
        from: from
      }
    }
    let self = this
    request(options)
    .then((response, body) => {

     history.status = 'send'
      self.saveHistory(history)
    })
    .catch ((e) => {
      history.status = 'failed'
      self.saveHistory(history)
    })
  },
  async saveHistory (history) {
    let conn = await this.dbConnect()
    await r.db('mepscloud').table('historicSms').insert(history).run(conn)
  }
}
