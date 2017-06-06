'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
import uuid from 'uuid-base62'
import mail from './lib/mail'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /auth', async function authenticate (req, res, params) {
  let user = await json(req)
  let auth = await db.authenticate(user.email, user.password)
  if (!auth) {
    return send(res, 401, { error: 'invalid crendentials' })
  }
  let data = await db.findUserByEmail(user.email)
  // if (data.active) {
    let payload = {
      email: data.email,
      name: data.username,
      id: data.id
    }
    let token = await utils.signToken(payload, config.secret)
    return send(res, 200, token)
  // } else {
  //   return send(res, 400, {info: `user is not active, please check your email`, email: data.email})
  // }
})
hash.set('POST /recoverPassword', async function recoverPassword (req, res, params) {
  let data = await json(req)
  try {
    let token = uuid.uuid()
    let user = await db.findUserByEmail(data.email)
    if (user) {
      await db.update('users', user.id, {tokenRestePassword: token})
      let to = [
        {
          to :[{
            email: data.email
          }]
        }
      ]
      mail.sendSingle('recoverPassword@mepscloud.com', `<p> para recuperar tu contraseña dale click al siguente link <a href = "https://mepscloud.com/reset/password/${token}"> click </a> </p>`, 'recupera tu contraseña', to)
      return send(res, 200, {data: true})
    } else {
      return send(res, 404, {data: 'we cant find this user'})
    }
  } catch (e) {
    return send(res, 500, {error: 'sorry we have a problem'})
  }
})

hash.set('GET /activateAccount/:token', async function activateAccoun (req, res, params) {
 let token = params.token
  try {
    let activate = await db.activateAccount(data.token)
    if (activate) {
      return send(res, 200, {sucess: 'the account is ready to use'})
    }
    return send(res, 400, {error: 'we cant be find this user'})
  } catch (e) {
    return send(res, 500, {error: `we sorry, an error occurred ${e.message} `})
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
