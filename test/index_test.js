const assert = require('chai').assert
const createRequest = require('../index').createRequest

describe('createRequest', () => {
    const jobID = '1'

    context('successful calls', () => {
        const requests = [
            { name: 'works without id and ipfs host', testData: {data: {endpoint: 'CPtoYAMj526'}}},
            { name: 'gets ig post and uploads to ipfs', testData: {id: jobID, data: {endpoint: 'CPtoYAMj526'}}},
            { name: 'ipfs host passed in', testData: {id: jobID, data: {endpoint: 'CPtoYAMj526', ipfs_host: 'http://127.0.0.1:5001'}}}
        ]

        requests.forEach(req => {
            it(`${req.name}`, (done) => {
                createRequest(req.testData, (statusCode, data) => {
                    assert.strictEqual(statusCode, 200)
                    assert.strictEqual(data.jobRunID, jobID)
                    assert.isNotEmpty(data.data)
                    assert.strictEqual(data.result, "QmNhAafBtaSW22nmfQHKvCzZLDDhhAzrCmih3yNnVPWS7B")
                    done()
                })
            })
        })
    })

    context('error calls', () => {
        const requests = [
            { name: 'empty body', testData: {} },
            { name: 'empty data', testData: { data: {} } },
            { name: 'endpoint not supplied', testData: { id: jobID, data: { wtf: '12345' } } },
            { name: 'unexistent post', testData: {id: jobID, data: {endpoint: 'nothing'}}},
            { name: 'ipfs host not available', testData: {id: jobID, data: {endpoint: 'CPtoYAMj526', ipfs_host: 'http://127.0.0.1:5002'}}}
        ]

        requests.forEach(req => {
            it(`${req.name}`, (done) => {
                createRequest(req.testData, (statusCode, data) => {
                    assert.equal(statusCode, 500)
                    assert.equal(data.jobRunID, jobID)
                    assert.equal(data.status, 'errored')
                    assert.isNotEmpty(data.error)
                    done()
                })
            })
        })
    })
})