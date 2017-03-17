'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
import mail from './lib/mail'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /send', async function sendCampaingEmail (req, res, params) {
    let data = await json(req)
    let campaing = null
    let user = null
    try {
      let token = await utils.extractToken(req)
      user = await utils.verifyToken(token, config.secret)
      user = await db.find('users', user.id)
      campaing = await db.find('campaingEmails', data.campaing)
      await utils.checkUser(user, campaing)
    } catch (e) {
      return send(res, 401, 'Unauthorized')
    }
    try {
      let contacts = await db.countContacts(campaing.databaseId)
      console.log(contacts)
      if (user.balanceEmail < contacts) {
        console.log('no tienes saldo suficiente')
        await db.destroy('campaingEmails',data.campaing)
        return send(res, 400, {error: 'no tienen saldo suficiente para enviar esta campaña'})
      }
      await mail.sendMultiple(campaing.id, contacts)
      send(res, 200, {data: 'camapaign sended'})
    }
    catch (e) {
      console.error(e.message)
      return send(res, 500, {error: `an error ocurried ${e.message}`})
    }
})

export default async function main (req, res) {
  let  { method, url } = req
  let match = hash.get(`${method.toUpperCase()} ${url}`)
  if (match.handler) {
    try {
      await match.handler(req, res, match.params)
    } catch (e) {
      send(res, 500, {error: e.message})
    }
  } else {
    send(res, 404, {error: 'route not found'})
  }
}