'use strict'

import httpHash from 'http-hash'
import { send, json } from 'micro'
import Db from 'mepscloud-db'
import config from './config'
import DbStub from './test/stub/db'
import utils from './lib/utils'
// const env = process.env.NODE_ENV || 'test'
const env = 'production'
const hash = httpHash()
let db = new Db(config.db)

hash.set('POST /create', async function create (req, res, params) {
  let data = await json(req)

  try {
  await db.connect()
    for (let i = 0; i < data.length; i++) {
      if (data[i].campaingId) {
        let newData = {
          campaingId: data[i].campaingId,
          event: data[i].event,
          email: data[i].email,
          date: data[i].timestamp,
          userId: data[i].userId
        }
        await db.createHook(newData)
      }
    }
    await db.disconnet()
  } catch (e) {
    disconnet
    console.log(e.message)
    return send(res, 500, {error: e.message})
  }
})
hash.set('GET /', async function get (req, res, params) {
  try {
    send(res, 200, {algo: 'asdasdasda'})
  } catch (e) {
    console.error(e.message)
  }
})
hash.set('POST /', async function testPost (req, res, params) {
  send (res, 201, {algo: 'asdasdad'})
})
hash.set('GET /loaderio-56a2cc8c2a5a4d17a63a478d5b78164e', async function loaderio (req, res, params) {
  send(res, 200, 'loaderio-56a2cc8c2a5a4d17a63a478d5b78164e')
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
