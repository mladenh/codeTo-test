const RateLimitedRequest = require('@obvsg/rate-limited-request/lib/request');
const {AlmaApiConnection, Bib, Bibs} = require('@obvsg/alma-js');

/**
 *
 */
function isACNr(id: string) {
  return /^AC[0-9]{8}$/i.test(id);
}

/**
 *
 */
function getAlmaConnection(apikey: string | undefined = process.env.API_KEY) {
  const conn = new AlmaApiConnection(
    {
      apikey: apikey,
    },
    200000,
  );

  return conn;
}

/**
 *
 */
async function fetchBibFromAlma(id: string, conn = getAlmaConnection()) {
  try {
    if (isACNr(id)) {
      const bibObj = new Bibs({apiConnection: conn});
      const bibs = await bibObj.query({other_system_id: id});

      for await (const bib of bibs) {
        return await bib.retrieve();
      }
    } else {
      console.info('No valid id');
      return undefined;
    }
  } catch (err) {
    console.error('Error  ' + id, err);
    throw err; // Rethrow the error
  }
}

export {fetchBibFromAlma, getAlmaConnection, isACNr};
