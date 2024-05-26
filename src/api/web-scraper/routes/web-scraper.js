module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/web-scraper/get-content',
      handler: 'web-scraper.extractContent',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
