import { authenticate, listMarketCatalogue, listMarketBook, placeOrders } from "betfair-api-ts";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { MarketCatalogue, MarketBook, Runner, PlaceInstruction, PlaceExecutionReport, MarketVersion } from "betfair-api-ts/lib/types/bettingAPI/betting";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
    try {
        await auth();
        // Save an investment
        const nextRace = await getNextRace();
        const options = await getOptions(nextRace.marketId);
        makeBet(options.market, options.runner, 1, true);
        res.status(200).json({ nextRace, options });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
}

async function auth() {
    const certificatePath = "./client-2048.crt";
    const keyPath = "./client-2048.key";

    if (!certificatePath || !keyPath) {
        throw new Error("BETFAIR_CERT_PATH or BETFAIR_KEY_PATH is not set in environment variables");
    }

    const certificate = fs.readFileSync(certificatePath).toString();
    const certificateKey = fs.readFileSync(keyPath).toString();

    await authenticate({
        username: "barryearsman@gmail.com",
        password: "CarobSoup&110",
        appKey: "4C6e7DiVQTsa6mZi",
        certificate,
        certificateKey,
    });
}

async function getNextRace(): Promise<MarketCatalogue> {
    const HORSE_RACING = "7";
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const marketCatalogues: MarketCatalogue[] = await listMarketCatalogue({
        filter: {
            eventTypeIds: [HORSE_RACING],
            bspOnly: true,
            marketStartTime: {
                from: now.toISOString(),
                to: tomorrow.toISOString()
            },
            marketTypeCodes: ['WIN']
        },
        maxResults: 1,
        sort: 'FIRST_TO_START',
        marketProjection: ['EVENT', 'MARKET_START_TIME', 'RUNNER_DESCRIPTION', 'RUNNER_METADATA'],
    });

    if (marketCatalogues.length === 0) {
        throw new Error("No matching events");
    }
    return marketCatalogues[0];       
}

async function getOptions(marketId: string): Promise<{runner: Runner, market: MarketBook}> {
    const marketBooks: MarketBook[] = await listMarketBook({
        marketIds: [marketId],
        priceProjection: {
            priceData: ['EX_BEST_OFFERS', 'SP_AVAILABLE', 'SP_TRADED'],
            exBestOffersOverrides: {
                bestPricesDepth: 1,
                rollupModel: 'STAKE',
                rollupLimit: 0,
            },
            virtualise: true
        }
    });

    if (marketBooks.length === 0) {
        throw new Error("No market book data available");
    }

    const marketBook = marketBooks[0];
    if (!marketBook.runners) {
        throw new Error("No runners in market book data");
    }
    const fav = getFavouriteBack(marketBook.runners);
    return {
        market: marketBook,
        runner: fav
    }
}

function getFavouriteBack(runners: Runner[]): Runner {
    // Sort by price
    runners.sort((a, b) => {
        return a.ex?.availableToBack?.[0]?.price! - b.ex?.availableToBack?.[0]?.price!;
    });
    // Return the first runner
    return runners[0];
}


function calculatePositiveSet(runners: Runner[], lay: boolean, littleEndian: boolean): Runner[] {
    // Sort selections by odds (ascending)
    // Get the betfair odds for each runner
    console.log(`Calculating positive set for ${lay ? 'lay' : 'back'}`);

    let positiveSet: any[] = [];

    // Get runners available
    let availableRunners = runners.filter(runner => 
        {
            return runner.status === "ACTIVE" 
            && (lay ? runner.ex?.availableToLay?.[0]?.price : runner.ex?.availableToBack?.[0]?.price)
        }
    );

    // Sort runners by odds, highest to lowest, or if littleEndian = true, lowest to highest
    availableRunners = availableRunners.sort((a, b) => {
        const runner1 = littleEndian ? a : b;
        const runner2 = littleEndian ? b : a;             
        if (lay) {
            return (runner1.ex?.availableToLay?.[0]?.price ?? 0) - (runner2.ex?.availableToLay?.[0]?.price ?? 0);
        } else {
            return (runner1.ex?.availableToBack?.[0]?.price ?? 0) - (runner2.ex?.availableToBack?.[0]?.price ?? 0);
        }     
    });
 
    for (const runner of availableRunners) {
        const price = lay ? runner.ex?.availableToLay?.[0]?.price : runner.ex?.availableToBack?.[0]?.price;
        if (!price) continue;
        if (price > (positiveSet.length+1)) {
            console.log(`** Adding ${price}`);
            positiveSet.push(runner);
        } else {
            console.log(`Skipping runner with price ${price}`);
        }     
    }
    console.log(`Total runners in set: ${positiveSet.length}`);
    //console.log(`Positive set: ${JSON.stringify(positiveSet)}`);

    return positiveSet;
}


async function makeBet(market: MarketBook, runner: Runner, amountPerRunner: number, lay: boolean): Promise<PlaceExecutionReport | PlaceInstruction[]> {
    // Create an array of PlaceInstruction objects for each runner
    const instructions: PlaceInstruction = {
        orderType: 'LIMIT',
        selectionId: runner.selectionId,
        side: lay ? 'LAY' : 'BACK',
        limitOrder: {
            size: amountPerRunner,
            price: lay ? runner.ex?.availableToLay?.[0]?.price! : runner.ex?.availableToBack?.[0]?.price!,
            persistenceType: 'LAPSE',
            timeInForce: 'FILL_OR_KILL'
        }
    };

    // Place the orders
    try {
        const placeExecutionReport: PlaceExecutionReport = await placeOrders({
            marketId: market.marketId,
            instructions: [instructions],
            marketVersion: market,
            
            customerRef: `bet_${Date.now()}` // Unique reference for this set of bets
        });

        // Log the result
        console.log('Bets placed:', placeExecutionReport);

        // Check if all bets were placed successfully
        const allBetsPlaced = placeExecutionReport.instructionReports?.every(
            report => report.orderStatus !== 'EXPIRED' && report.status === 'SUCCESS'
        );

        if (!allBetsPlaced) {
            console.warn('Bet failed:', placeExecutionReport);
        }

        return placeExecutionReport;
    } catch (error) {
        console.error('Error placing bets:', error);
        throw error;
    }
}