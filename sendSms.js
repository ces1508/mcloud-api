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
  let user = null
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    campaing = await db.find('campaingSms', id)
    let check = await utils.checkUser(user, campaing)
    await db.disconnet()
  } catch (e) {
    return send(res, 401, 'unAuthorized')
  }
  try {
    if (typeof id !== 'undefined') {
        await db.connect()
        let data = {
          send: 0,
          failed: 0,
          userId: user.id,
          campaingId: id,
          type: 'sms'
      }
      await db.saveStatistics(data)
      await db.disconnet()
      if (!campaing.custom) {
        try {
          let contacts  = await sms.send(id, user.id)
          return send(res, 200, {data: 'campaña enviada'})
        } catch  (e) {
          console.error(e.message)
          return send(res, 500, {error: `ocurrió el siguente error al enviar la campaña ${e.message}`})
        }
      } else {
        try {
          let contacts = await sms.sendCustom(id, user.id)
          return send(res, 200, {data: 'campaña enviada'})
        } catch (e) {
        }
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
    let sendTest = await sms.sendTest(text, '333333', numbers)
    return send(res, 200, 'mensaje enviado')
  } catch (e) {
    return send(res, 500, 'error al enviar el mensaje')
  }
})
hash.set('GET /:id', async function raiz (req, res, params) {
  let id = params.id
  console.log(`request en la prueba de reporte y el id de la campaña es ${id}`)
  try {
    await db.connect()
    let data = await db.getReport(id, 'historicSms')
    console.log(data)
    await db.disconnet()
    send(res, 200, data)
  } catch  (e) {
    console.error(e.message)
    return send(res, 500, e.message)
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