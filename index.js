const { Requester, Validator } = require('@chainlink/external-adapter')
const cheerio = require('cheerio')
const _ = require('lodash');
const request = require('request-promise');
const fs = require('fs')
const {create} = require('ipfs-http-client')
let ipfs

// Return true for the adapter to retry.
const customError = (data) => {
    if (data.Response === 'Error') return true
    return false
}

const customParams = {
    endpoint: true,
    ipfs_host: false
}

const createRequest = (input, callback) => {
    const validator = new Validator(input, customParams, callback)
    const jobRunID = validator.validated.id
    const endpoint = validator.validated.data.endpoint
    const url = `https://www.instagram.com/p/${endpoint}`
    const ipfs_host = validator.validated.data.ipfs_host || 'http://127.0.0.1:5001/'

    ipfs = create(ipfs_host)

    const config = {
        method: "GET",
        url: url,
        responseType: 'text/html'
    }

    if (endpoint === undefined) {
        callback(500, Requester.errored(jobRunID, "The post id endpoint is required."))
        return
    }

    Requester.request(config, customError).then(res => {
        const $ = cheerio.load(`${res.data}`)
        const canonicalUrl = $('link[rel="canonical"]').attr('href');

        if (!canonicalUrl) {
          return reject({
            message: `Invalid media ID`,
            url
          });
        }

        const isVideo = $('meta[name="medium"]').attr('content') === 'video';
        const downloadUrl = isVideo ? $('meta[property="og:video"]').attr('content') : $('meta[property="og:image"]').attr('content');

        downloadAndSave(downloadUrl, ipfs_host).then(res => {
            console.log("HASH::  ", res)

            const response = {
                data: {
                    result: res
                },
                statusCode: 200
            }
            callback(200, Requester.success(jobRunID, response))
        })
        .catch(err => {
            callback(500, Requester.errored(jobRunID, err))
        })
    })
}


  /**
 * @param  {string} downloadUrl
 * @param  {string} filename
 * @return {Promise}
 */
function downloadAndSave(downloadUrl, ipfs_host) {
    return new Promise((resolve, reject) => {
      request.head(downloadUrl, error => {
        if (error) {
          return reject(error);
        }
  
        request
          .get(downloadUrl).then(async img => {
              await ipfs.add(img).then(res => {
                  const hash = res.path
                  resolve(hash)
              }).catch(err => {
                  reject(err)
              })
          }).catch(err => {
            reject(err)
          })
      });
    });
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
    createRequest(req.body, (statusCode, data) => {
      res.status(statusCode).send(data)
    })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
    createRequest(event, (statusCode, data) => {
      callback(null, data)
    })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
    createRequest(JSON.parse(event.body), (statusCode, data) => {
      callback(null, {
        statusCode: statusCode,
        body: JSON.stringify(data),
        isBase64Encoded: false
      })
    })
}

module.exports.createRequest = createRequest