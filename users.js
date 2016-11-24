'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import DbStub from './test/stub/db'
import config from './config'
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
  console.log(user)
  console.log(`env ${env}`)
  let result = await db.createUser(user)
  await db.disconnet()
  delete result.password
  console.log(result)
  send(res, 201, result)
})

hash.set('GET /:email', async function find (req, res, params) {
  await db.connect()
  let email = params.email
  let result = await db.findUserByEmail(email)

  if (!result) {
    return send(res, 404, {error: false})
  }
  delete result.password
  delete result.company
  await db.disconnet()
  send(res, 200, result)
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
