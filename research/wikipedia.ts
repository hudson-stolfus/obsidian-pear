class Wikipedia {

	constructor() {
		// this.initialize('Li Qiang')
	}

	async initialize(query: string) {
		const metadataUrl = new URL('https://en.wikipedia.org/w/rest.php/v1/search/page');
		metadataUrl.searchParams.set('q', query);
		metadataUrl.searchParams.set('limit', '1');

		const metadata = await (await fetch(metadataUrl, {
			headers: {
				'Accept': 'application/json',
				'Api-User-Agent': 'Obsidian Wikipedia Integration (hudson.stolfus@gmail.com)',
			}
		})).json();

		const summaryUrl = new URL(`https://en.wikipedia.org/api/rest_v1/page/summary/${metadata.pages[0].title}`);
		const summary = await fetch(summaryUrl, {
			headers: {
				'Accept': 'application/json',
				'Api-User-Agent': 'Obsidian Wikipedia Integration (hudson.stolfus@gmail.com)',
			}
		});
		const summaryJSON = await summary.json();

		const pageUrl = new URL(`https://en.wikipedia.org/w/rest.php/v1/page/${metadata.pages[0].title}`);
		const page = await fetch(pageUrl, {
			headers: {
				'Accept': 'text/html; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/HTML/2.1.0',
				'Api-User-Agent': 'Obsidian Wikipedia Integration (hudson.stolfus@gmail.com)',
				'Accept-Language': 'en'
			}
		});
		const pageJSON = await page.json();
		let wiki2md = require('wikitext2markdown');

//		console.log(wiki2md(pageJSON.source))
	}

}

export { Wikipedia }
