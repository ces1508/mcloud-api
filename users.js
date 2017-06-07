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
  if (!user) {
    return send(res, 404, {error: false})
  }
  //  if (user.active) {
    delete user.password
    delete user.company
    send(res, 200, user)
  // } else {
  //   return send(res, 401, {error: 'user is not active'})
  // }
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

hash.set('PATCH /profile', async function updateUser (req, res, params) {
  let user = null
  let data = await json(req)
  let newData = {}
  if (data.password) {
    delete data.password
  }
  if (data.empresa) {
    newData.empresa = data.empresa
  }
  if (data.username) {
    newData.username = data.username
  }

  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
  } catch (e) {
    return send(res, 401, 'unAuthorizate')
  }

   let updated = await db.update('users', user.id, newData)
  return send(res, 200, {error: false, updated: true})

})

hash.set('PATCH /update-password', async function updatePassword (req, res, params) {
  let data = await json(req)
  let user = null
  let oldPassword = utils.sha256(data.oldPassword)

  try {
    let token = await utils.extractToken(req)
    user = await utils.verifyToken(token, config.secret)
    let userDb = await db.find('users', user.id)

    if (userDb.password === oldPassword) {

      let newPassword = utils.sha256(data.newPassword)
      await db.update('users', user.id, {password: newPassword})

      return send(res, 200, 'contraseña actualizada')
    } else {
      return send(res, 401, 'unAuthorizate')
    }
  } catch (e) {
    return send(res, 500, {error: e.message})
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
