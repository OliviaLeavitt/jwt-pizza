import { sleep, check, group, fail } from 'k6'
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 15, duration: '1m' },
        { target: 10, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      startVUs: 1,
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
    Imported_HAR: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 20, duration: '1m' },
        { target: 20, duration: '3m30s' },
        { target: 0, duration: '1m' },
      ],
      gracefulRampDown: '30s',
      exec: 'imported_HAR',
    },
  },
}

// Scenario: Scenario_1 (executor: ramping-vus)

export function scenario_1() {
  let response

  // Automatically added sleep
  sleep(1)
}

// Scenario: Imported_HAR (executor: ramping-vus)

export function imported_HAR() {
  let response

  const vars = {}

  response = http.put(
    'https://pizza-service.olivialeavitt.click/api/auth',
    '{"email":"test@jwt.com","password":"test"}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        origin: 'https://pizza.olivialeavitt.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    }
  )
    if (!check(response, { 'status equals 200': response => response.status.toString() === '200' })) {
    console.log(response.body);
    fail('Login was *not* 200');
  }

  vars['token'] = jsonpath.query(response.json(), '$.token')[0]

  sleep(6.4)

  response = http.get('https://pizza-service.olivialeavitt.click/api/order/menu', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${vars['token']}`,
      'content-type': 'application/json',
      'if-none-match': 'W/"1fc-cgG/aqJmHhElGCplQPSmgl2Gwk0"',
      origin: 'https://pizza.olivialeavitt.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })

  response = http.get(
    'https://pizza-service.olivialeavitt.click/api/franchise?page=0&limit=20&name=*',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        'if-none-match': 'W/"5c-UrU6FPurLC0JcnOrzddwdfUXFBA"',
        origin: 'https://pizza.olivialeavitt.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    }
  )
  sleep(6.3)

  response = http.get('https://pizza-service.olivialeavitt.click/api/user/me', {
    headers: {
      accept: '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      authorization: `Bearer ${vars['token']}`,
      'content-type': 'application/json',
      origin: 'https://pizza.olivialeavitt.click',
      priority: 'u=1, i',
      'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })
  sleep(1.6)

  response = http.post(
    'https://pizza-service.olivialeavitt.click/api/order',
    '{"items":[{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.olivialeavitt.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    }
  )
  sleep(6.3)

  response = http.post(
    'https://pizza-factory.cs329.click/api/order/verify',
    '{"jwt":"eyJpYXQiOjE3NjM2ODc2OTAsImV4cCI6MTc2Mzc3NDA5MCwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImtpZCI6Ik9TcF94VzhlM3kwNk1KS3ZIeW9sRFZMaXZXX2hnTWxhcFZSUVFQVndiY0UifQ.eyJ2ZW5kb3IiOnsiaWQiOiJ0dGl2YWVsIiwibmFtZSI6Ik9saXZpYSBMZWF2aXR0In0sImRpbmVyIjp7ImlkIjo1LCJuYW1lIjoidGVzdCIsImVtYWlsIjoidGVzdEBqd3QuY29tIn0sIm9yZGVyIjp7Iml0ZW1zIjpbeyJtZW51SWQiOjEsImRlc2NyaXB0aW9uIjoiVmVnZ2llIiwicHJpY2UiOjAuMDAzOH1dLCJzdG9yZUlkIjoiMSIsImZyYW5jaGlzZUlkIjoxLCJpZCI6MjI1NH19.KyVaUpY56oSyHp8OO8V5Py163NRcjZARqwu1TiwNWqcGM9xmD3-CleH0vxp1EdGS6PnE9W2ziWGCUT7aY6O4Z6B911k---CJLbs_OY22CNYkRs1IvpiGngD9OmCyhTJmnDFPaD_OsvoIVtjRNykYcQgPb3yKtVBOK7i27sdY8i3jmbcSVRnmfEMld-jtMwP88s9yPv0qY659ZQBmskrG0A-VQMu9ghVH8gyPa9rT907RxsUrVkUr1Y71fWjtUIiwZd288WWCgACUcWifM05a-D0aVlmj5PJxVHFkO4WiZulHTeezxZZsAzHPxuE8Cwx2mJ21mB4I0NJHDbi9eEDyQK6B9Bdo7vXgGDt5dK0dT71dqflxL-1PSjvl3YG1R_yb6fnBqyp2ozQdFdkhnFsk07M9zp3SZxQ6UrsTJQDnGM1_9sakMHrvsW4eHre-Zgt8j2-DKdI0yG5xvHZNzw7vCRqOYTEsmfNcePrYtwOpL_g4euUJJsnmJ_DoJU9TOE3eXQywZidA5RLrz7YaVLn8Rd7-KaLmbJlU5YuvKlQ5aknKAs7llnTgKbipwowYKcRF3raLQzfkWw3jrFj6IZfV1FSbtsof6wNu3PLHht6y2b44aTOi_MXsNBLFDiJ-XdaM2p0rAAB6aRCH4_GLx2di5cuNVzYm8I-xgO4MoZD7kDc"}',
    {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.olivialeavitt.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-storage-access': 'active',
      },
    }
  )
}