'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const env = 'testc'
const hash = httpHash()
let db = new Db(config.db)

if (env === 'test') {
  db = new DbStub()
}

hash.set('POST /auth', async function authenticate (req, res, params) {
  await db.connect()
  let user = await json(req)
  let auth = await db.authenticate(user.email, user.password)
  await db.disconnet()
  if (!auth) {
    return send(res, 401, { error: 'invalid crendentials' })
  }

  let token = await utils.signToken({ email: user.username }, config.secret)
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
