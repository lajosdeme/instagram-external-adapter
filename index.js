const { Requester, Validator } = require('@chainlink/external-adapter')
const _ = require('lodash');
const fs = require('fs')
const {create} = require('ipfs-http-client')
let ipfs
const save = require('instagram-save')
const bs58 = require('bs58')

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
    //validate and get params
    const validator = new Validator(input, customParams, callback)
    const jobRunID = validator.validated.id
    const endpoint = validator.validated.data.endpoint
    const ipfs_host = validator.validated.data.ipfs_host || 'http://127.0.0.1:5001/'

    //create ipfs
    ipfs = create(ipfs_host)

    //save instagram img
    save(endpoint, `${__dirname}`).then(async res => {
      //read the file that was saved
      const file = fs.readFileSync(res.file)

      //add to ipfs
      await ipfs.add(file).then(result => {
        console.log(result)
        const hash = result.path
        //create multihash from CID
        const multihash = getMultihashFromBase58(hash)
        const response = {
          data: {
              result: multihash.digest
          },
          statusCode: 200
      }

      //delete the img that was saved
      fs.unlink(res.file, err => {
        console.log(err)
      })
      //successful request
      callback(200, Requester.success(jobRunID, response))
      }).catch(err => {
        console.log(err)
        //failed request
        callback(500, Requester.errored(jobRunID, err))
      })
    })
}

//helper for converting CID to multihash
function getMultihashFromBase58(multihash) {
  const decoded = bs58.decode(multihash);

  return {
    digest: `0x${decoded.slice(2).toString('hex')}`,
    hashFunction: decoded[0],
    size: decoded[1],
  };
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