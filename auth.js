'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const hash = httpHash()
let db = new Db(config.db)
const env = 'production'
if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /auth', async function authenticate (req, res, params) {
  console.log('entro al post de auth')
  await db.connect()
  let user = await json(req)
  let email = user.email
  let auth = await db.authenticate(user.email, user.password)
  console.log(auth)
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
  console.log(token)
  await db.disconnet()
  send(res, 200, token)
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
