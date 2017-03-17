'use strict'

import jwt from 'jsonwebtoken'
import bearer from 'token-extractor'
import config from '../config'
import Db from 'mepscloud-db'
const db = new Db(config.db)
export default {
  async signToken (payload, secret, options) {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) return reject(err)
      resolve(token)
      })
    })
  },

  async verifyToken (token, secret, options) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, options, (err, decode) => {
        if (err) return reject(err)
        resolve(decode)
      })
    })
  },

  async extractToken (req) {
    return new Promise((resolve, reject) => {
      bearer(req, (err, token) => {
        if (err) return reject(err)
        resolve(token)
      })
    })
  },

  async checkUser (encoded, data) {
    if ((!encoded.id) || (data.userId !== encoded.id) || (typeof encoded === 'undefined') || typeof encoded.id === 'undefined') {
      return Promise.reject(new Error('unAuthorized'))
    } else {
      return Promise.resolve(true)
    }
  },

  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },
  async validCreditCard(value) {
    if (/[^0-9-\s]+/.test(value)) return false
    var nCheck = 0, nDigit = 0, bEven = false
    value = value.replace(/\D/g, "")
    for (var n = value.length - 1; n >= 0; n--) {
      var cDigit = value.charAt(n)
          nDigit = parseInt(cDigit, 10)
      if (bEven) {
        if ((nDigit *= 2) > 9) nDigit -= 9
      }
      nCheck += nDigit
      bEven = !bEven
    }
    return Promise.resolve((nCheck % 10) == 0)
  },
  ownCreditCard (number) {
    if (/[^0-9-\s]+/.test(number)) return false;
    number = number.replace(/\D/g, "");
    let nAcum = 0, nDigit = 0, bEven = true
    for (let i = 0; i < number.length -1 ; i++) {
      let cDigit = number.charAt(i)
      nDigit = parseInt(cDigit, 10)
      if (bEven) {
        if ((nDigit *= 2) > 9) nDigit -= 9
      }
      nAcum += nDigit
      bEven = !bEven
    }
    let total = (nAcum / 10)
      total = Math.round(total+1) * 10
    // console.log('ultimo numero', total - nAcum)
  },
  async creditCardFranchise (number) {
    switch (number.charAt(0)){
      case '4':
        return 'VISA'
        break
      case '5':
       return 'MASTERCARD'
        break
      case '3':
        return 'AMEX'
      default:
        console.log(number.charAt(0) === '4')
        return 'o es codensa o no es valida'
    }
  },
  async  getPriceByPlan (type, amount) {
    amount = parseInt(amount)
    let plans = []
    let price = 0
    if (type === "sms" || type === "SMS") {
      plans = await db.priceByPlan('SMS')
    } else {
      plans = await db.priceByPlan("EMAIL")
    }
    for (let i = 0; i < plans.length; i++) {
      if (amount >= plans[i].min &&  amount <= plans[i].max ) {
        return price = plans[i].price
        break
      }
    }
    // return price
  }
}
