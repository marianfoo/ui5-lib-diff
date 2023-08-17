const axios = require('axios');
const fs = require('fs').promises;

const url = 'https://help.sap.com/http.svc/whatsnew';

const headers = {
  authority: 'help.sap.com',
  accept: 'application/json, text/plain, */*',
  'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7,fr-FR;q=0.6,fr;q=0.5',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  origin: 'https://help.sap.com',
  pragma: 'no-cache',
  referer:
    'https://help.sap.com/whats-new/67f60363b57f4ac0b23efd17fa192d60?locale=en-US',
  'sec-ch-ua':
    '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
};

const data = {
  locale: 'en-US',
  state: 'PRODUCTION',
  from: 0,
  size: 129993,
  sort: [
    { name: 'Valid_as_Of', direction: 'DESC' },
    { name: 'Category', direction: 'ASC' },
    { name: 'Title', direction: 'ASC' },
  ],
  columns: [
    { name: 'Version', query: [] },
    { name: 'Type', query: [] },
    { name: 'Category', query: [] },
    { name: 'Title', query: [] },
    { name: 'Description', query: [] },
    { name: 'Action', query: [] },
    {
      name: 'Valid_as_Of',
      unscheduledItems: false,
      dateFrom: '',
      dateTo: '',
      tableSearch: 0,
    },
    {
      name: 'outputloio',
      query: ['40dc77b604f54b21a2faadc7860dc5d7'],
      tableSearch: 0,
    },
    { name: 'deliverable.version', tableSearch: 0, query: [] },
    {
      name: 'Latest_Revision',
      tableSearch: 0,
      dateFrom: '',
      dateTo: '',
      unscheduledItems: false,
    },
  ],
};
function transformData(item) {
  if (Array.isArray(item.Type) && item.Type.length > 0) {
    item.Type = item.Type[0];
  }

  if (Array.isArray(item.Action) && item.Action.length > 0) {
    item.Action = item.Action[0];
  }

  if (Array.isArray(item.Category) && item.Category.length > 0) {
    item.Category = item.Category[0];
  }

  if (Array.isArray(item.Version) && item.Version.length > 0) {
    item.Version = item.Version[0];
  }

  return item;
}

axios
  .post(url, data, { headers: headers })
  .then(async (response) => {
    if (
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data.results)
    ) {
      const transformedResults = response.data.data.results.map(transformData);
      await fs.writeFile(
        'de.marianzeis.ui5libdiff/webapp/data/whatsnew.json',
        JSON.stringify(transformedResults, null, 4)
      );
    } else {
      console.error('Unexpected response format');
    }
  })
  .catch((error) => {
    console.error('Error making the request:', error);
  });
