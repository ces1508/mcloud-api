'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
import uuid from "uuid-base62"
import mail from './lib/mail'
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /create', async function create (req, res, params) {
  await db.connect()
  let user = await json(req)
  user.active = false
  user.tokenActivate = uuid.uuid()
  let result = await db.createUser(user)
  delete result.password
  let to = [{to :[{ email: email.email}]}]
  await mail.sendSingle('welcome@mepscloud.com', 'hola', 'activata tu cuenta ya!', to)
  send(res, 201, result)
})

hash.set('GET /:email', async function find (req, res, params) {
  let email = params.email
  let user = await db.findUserByEmail(email)
  if (!user.active) {
    return send(res, 401, {error: 'user is not active'})
  }
  if (!user) {
    return send(res, 404, {error: false})
  }
  delete user.password
  delete user.company
  send(res, 200, result)
})

hash.set('GET /campaign-sended', async function getDataCampaignSended (req, res, params) {
  let user = null
  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    console.log(e.message)
    return send(res, 401, {error: 'unAuthorizade'})
  }
  try {
    let response = await db.campaignSended(user.id)
    send(res, 200, response)
  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: `ocurrió un error ${e.message}`})
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
