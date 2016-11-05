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

hash.set('POST /sms/:id/', async function authenticate (req, res, params) {
  console.log('entro al post de auth')
  await db.connect()
  let user = await json(req)
  let email = user.email
  let auth = await db.authenticate(user.email, user.password)
  if (!auth) {
    await db.disconnet()
    return send(res, 401, { error: 'invalid crendentials' })
  }
  let data = await db.findUserByEmail(email)
  let payload = {
    email: data.email,
    name: data.username,
    id: data.id
  }
  let token = await utils.signToken(payload, config.secret)
  await db.disconnet()
  send(res, 200, token)
})
hash.set('POST /email/', async function sendCampaingSms (req, res, params) {
   let campaing = await json(req)
  let user = null
  try {
       let token = await utils.extractToken(req)
       user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401,'Unauthorized')
  }

  try {
     await db.connect()
     let campaing = await db.find('campaingEmail', campaing.id)
     await utils.checkUser(user.id, campaing.userId)
    let to = [
      {
        to:[
          {
            email: 'ces1508@gmail.com'
          },
          {
            email: 'ces_1508@hotmail.com'
          }
        ]
      }
    ]
    let email = await mail.send('ces@test.com', 'probando el envio de single email', 'test 1', to)
    send(res, 200, email)
  } catch (e) {
    return send(res, 403, e)
  }
})

hash.set('POST /send', async function sendCampaingEmail (req, res, params) {
    let data = await json(req)
    let campaing = null
    await db.connect()
    try {
      let token = await utils.extractToken(req)
      user = await utils.verifyToken(token, config.secret)
      campaing = await db.find('campaingEmail', data.campaing)
      await utils.checkUser(user, campaing)
    } catch (e) {
      await db.disconnet()
      return send(res, 401, 'Unauthorized')
    }
    try {
      await mail.sendMultiple(campaing.id)
      send(res, 200, {data: 'camapaign sended'})
    }
    catch (e) {
      console.error(e.message)
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