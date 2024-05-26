'use strict';

/**
 * A set of functions called "actions" for `web-scraper`
 */
module.exports = {
  async extractContent(ctx) {
    try 
    {
      const { url } = ctx.query;
      if (!url) {
        ctx.throw(400, 'Missing url');
      }

      const data = await strapi.service('api::web-scraper.web-scraper').extractContent(url);
      ctx.body = data;
    } catch (err) {
      ctx.badRequest('Content extraction error', { moreDetails: err });
    }
  },
};

