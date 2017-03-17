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

hash.set('POST /report-index', async function reportIndex (req, res , params) {
  let data = await json(req)
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let dataSms = []
    let dataEmail = []
    if (data.type === 'week') {
      let initialDate = Math.round(new Date().getTime()/ 1000.0)
      let lastDate = new Date()
      lastDate.setDate(lastDate.getDate() -7)
      lastDate = Math.round(new Date(lastDate).getTime() / 1000.0)
      console.log(initialDate, lastDate)
      dataEmail = await db.getReportEmailbyDate(user.id, initialDate, lastDate)
    }

    if (data.type === 'month') {
      // let initialDate = Math.round(new Date().getTime()/ 1000.0)
      // let lastDate = new Date()
      // lastDate.setDate(lastDate.getDate() -28)
      // lastDate = Math.round(new Date(lastDate).getTime() / 1000.0)
      // dateEmai = yield getReportEmailbyDate(user.id, initialDate, lastDate)
    }
    send(res, 200, {email: dataEmail, sms: dataSms})
  }
  catch (e) {
    console.error(e.message)
    return send(res, 500,)
  }
})
hash.set('GET /:id/sms', async function find (req, res, params) {
  let id = params.id
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingSms', id)
    await utils.checkUser(user, campaing)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 401, 'unAuthorized')
  }
  try {
    let data = await db.createReport(id,'sms')
    send(res, 200, data)
  } catch (e) {
    console.error(e.message)
    return send(res, 500, {error: e.message})
  }
})
hash.set('POST /report-week-sms', async function rWeek (req, res, params) {
  // let date = await json(req)
  // try {
  //   let token = await utils.extractToken(req)
  //   let user = await utils.verifyToken(token, config.secret)
  //   fech = fech.setDate(fech.getDate() - i)
  //   for (let i = 0; i <= 6; i++) {
  //     let fech = new Date(date.date)
  //     fech = fech.setDate(fech.getDate() - i)
  //     fech = new Date(fech)
  //     let day = fech.getDate()
  //     let month = fech.getMonth()
  //     let year = fech.getFullYear()
  //     let midnight = Math.round(new Date(year, month, day, 23, 59, 59).getTime() /1000.0)
  //     let dawn = Math.round(new Date(year, month, day).getTime() /1000.0 )
  //     data.push(db.getReportSmsByDay(user.id, dawn, midnight))
  //   }
  //   let response = await Promise.all(data)
  //   send(res, 200, response)
  // }
  // catch (e) {
  //   console.error(e.message)
  //   return send(res, 500, e.message)
  // }

})
hash.set('POST /report-by-month', async function reportMonth (req, res, params) {
  let date = await json(req)
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let dataSms = []
     for (let i = 0; i <= 28; i++) {
      let fech = new Date(date.date)
      fech = fech.setDate(fech.getDate() - i)
      fech = new Date(fech)
      let day = fech.getDate()
      let month = fech.getMonth()
      let year = fech.getFullYear()
      let midnight = Math.round(new Date(year, month, day, 23, 59, 59).getTime() /1000.0)
      let dawn = Math.round(new Date(year, month, day).getTime() /1000.0 )
      dataSms.push(db.getReportSmsByDay(user.id, dawn, midnight))
    }
    let sms = await Promise.all(dataSms)
    send(res, 200, sms)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 500,)
  }
})
hash.set('GET /:id/email', async function reportByCampaignEmail (req, res, params) {
  let id = params.id
  await db.connect()
  try {
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let campaing = await db.find('campaingEmails', id)
    await utils.checkUser(user, campaing)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 401, 'unAuthorized')
  }
  try {
    let data = await db.graphEmailsbyCampaign(id)
    send(res, 200, data)
  } catch (e) {
    return send(res, 500, {error: e.message})
  }
})
hash.set('POST /reportEmail-by-month', async function reportEmailMonth (req, res, params) {
  let date = await json(req)
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let dataEmail = []
     for (let i = 0; i <= 28; i++) {
      let fech = new Date(date.date)
      fech = fech.setDate(fech.getDate() - i)
      fech = new Date(fech)
      let day = fech.getDate()
      let month = fech.getMonth()
      let year = fech.getFullYear()
      let midnight = Math.round(new Date(year, month, day, 23, 59, 59).getTime() /1000.0)
      let dawn = Math.round(new Date(year, month, day).getTime() /1000.0 )
      dataEmail.push(db.getReportEmailByDay(user.id, dawn, midnight))
    }
    let emails = await Promise.all(dataEmail)
    send(res, 200, emails)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 500,)
  }
})
hash.set('POST /reportEmail-by-week', async function reportEmailWeek (req, res, params) {
  let date = await json(req)
  try {
    await db.connect()
    let token = await utils.extractToken(req)
    let user = await utils.verifyToken(token, config.secret)
    let dataEmail = []
     for (let i = 0; i <= 6; i++) {
      let fech = new Date(date.date)
      fech = fech.setDate(fech.getDate() - i)
      fech = new Date(fech)
      let day = fech.getDate()
      let month = fech.getMonth()
      let year = fech.getFullYear()
      let midnight = Math.round(new Date(year, month, day, 23, 59, 59).getTime() /1000.0)
      let dawn = Math.round(new Date(year, month, day).getTime() /1000.0 )
      dataEmail.push(db.getReportEmailByDay(user.id, dawn, midnight))
    }
    let emails = await Promise.all(dataEmail)
    send(res, 200, emails)
  }
  catch (e) {
    console.error(e.message)
    return send(res, 500,)
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
