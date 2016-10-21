'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
import sms from './lib/sms'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /send/', async function sendSms (req, res, params) {
  let data = await  json(req)
  let id = data.campaingId
  let campaing = null
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    campaing = await db.find('campaingSms', id)
    let check = await utils.checkUser(user, campaing)
    await db.disconnet()
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    if (typeof id !== 'undefined') {
      if (!campaing.custom) {
        let contacts  = await sms.send(id)
        return send(res, 200, {data: 'campaña enviada'})
      } else {
        return send(res, 200, {data: 'aun no soportamos las campañas custom'})
      }
    }
  } catch (e) {
    return send(res, 200, {error: 'error al enviar la campaña'})
  }
})
hash.set('POST /send/test', async function testCampaing (req, res, params) {
   let data = await  json(req)
  let text = data.text
  let numbers = []
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    await db.disconnet()
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    numbers[0] = `57${data.phone}`
    let sendTest = await sms.sendTest(Text, '333333', numbers)
    return send(res, 200, 'mensaje enviado')
  } catch (e) {
    return send(res, 500, 'error al enviar el mensaje')
  }
})
hash.set('GET /', async function raiz (req, res, params) {
  send(res, 200, {hola: 'si es asincrono'})
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