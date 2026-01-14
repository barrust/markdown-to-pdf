#!/usr/bin/env node
'use strict';

// Import everything we need
const fs = require('fs');
const hljs = require('highlight.js');
const express = require('express');
const mustache = require('mustache');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios'); // For HTTP requests, including image fetching
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItTOC = require('markdown-it-toc-done-right');
const markdownItEmoji = require('markdown-it-emoji');
const markdownTaskLists = require('markdown-it-task-lists');
const markdownItFootnote = require('markdown-it-footnote');
const twemoji = require('twemoji');


function nullCoalescing(value, fallback) {
	return value !== undefined && value !== null ? value : fallback;
}

function getFileContent(file, encoding = 'utf-8') {
	return fs.readFileSync(file).toString(encoding);
}

// GetMarkdownIt returns the instance of markdown-it with the correct settings
function GetMarkdownIt() {
	let md = new markdownIt({
		html: true,
		breaks: false,
		xhtmlOut: true,
		style: 'github',
		// Handle code snippet highlighting, we can catch this error as it will
		// be correctly handled by markdown-it
		highlight: function(str, lang) {
			if(lang && hljs.getLanguage(lang)) {
				try {
					return hljs.highlight(str, {language: lang}).value;
				}catch(__) {
				}
			}

			return ''; // use external default escaping
		}
	});

	md.use(markdownItAnchor, {
		permalink: markdownItAnchor.permalink.ariaHidden({
			class: 'anchor',
			symbol: '<span class="octicon octicon-link"></span>',
			placement: 'before',
		}),
		slugify: slugify,
	});
	md.use(markdownItTOC, {
		containerId: 'table-of-contents',
		listType: 'ul',
		slugify: slugify,
	});

	// Enable emoji support with twemoji rendering
	md.use(markdownItEmoji.full);
	md.renderer.rules.emoji = function(token, idx) {
		return twemoji.parse(token[idx].content);
	};

	// enabled task allows for the HTML to be toggled
	md.use(markdownTaskLists, {/*enabled: true,*/ label: true, labelAfter: true});
	md.use(markdownItFootnote);

	return md;
}

// encodeImage is a helper function to fetch a URL and return the image as a base64 string
async function encodeImage(url) {
       try {
	       const response = await axios.get(url, { responseType: 'arraybuffer' });
	       if (response.status !== 200) {
		       console.log('Image not found, is the image folder route correct? [' + url + ']');
		       return null;
	       }
	       const contentType = response.headers['content-type'];
	       const base64 = Buffer.from(response.data, 'binary').toString('base64');
	       return `data:${contentType.replace(' ', '')};base64,${base64}`;
       } catch (error) {
	       console.log(error);
	       return null;
       }
}

const used_headers = {};

// 'slugify' is a helper function to escape characters in the titles URL
function slugify(string) {
	let slug = encodeURIComponent(string.trim()
		.toLowerCase()
		.replace(/[\]\[!"#$%&'()*+,.\/:;<=>?@\\^_{|}~`]/g, '')
		.replace(/\s+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, ''));

	if(used_headers[slug]) {
		slug += '-' + ++used_headers[slug];
	}else {
		used_headers[slug] = 0;
	}

	return slug;
}


const PDFLayout = {
	format: 'A4',
	scale: .9,
	displayHeaderFooter: false,
	margin: {top: 50, bottom: 50, right: 50, left: 50}
};


class MarkdownToPDF {
	constructor(options) {
		this._image_dir = options.image_dir;
		this._style = options.style;
		this._template = options.template;
		this._table_of_contents = options.table_of_contents;
	}

	start() {
		this._image_server_app = express();
		this._image_server_app.use(express.static(this._image_dir));
		this._image_server = this._image_server_app.listen(3000);

		console.log("Started image server with image folder route '" + this._image_dir + "'.\n");
	}

	async convert(data, title) {
		if(typeof data !== 'string') throw "Parameter 'data' has to be a string containing Markdown content";
		if(typeof title !== 'string' && title !== undefined) throw "Parameter 'title' has to be a string";

		// Convert MD to HTML
		let preHTML = this._convertToHtml(data, nullCoalescing(title, ''));
		let html = await this._convertImageRoutes(preHTML).then(function (html) {
			return html;
		}).catch(function (err) {
			throw `Error while converting images: ${err}`;
		})

		// Build the PDF file
		const browser = await puppeteer.launch({
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
			args: [
				'--headless',
				'--no-sandbox',
				'--disable-gpu',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--single-process'
			]
		}).then(function (browser) {
			return browser;
		}).catch(function (err) {
			throw `Error while launching puppeteer: ${err}`;
		})

		const page = await browser.newPage().then(function (page) {
			return page;
		}).catch(function (err) {
			throw `Error while creating new page: ${err}`;
		})

		await page.goto('data:text/html;,<h1>Not Rendered</h1>', {waitUntil: 'domcontentloaded', timeout: 2000}).catch(function (err) {
			throw `Error while rendering page: ${err}`;
		})
		await page.setContent(html).catch(function (err) {
			throw `Error while rendering page: ${err}`;
		})

		let pdf = await page.pdf(PDFLayout).then(function (pdf) {
			return pdf;
		}).catch(function (err) {
			throw `Error while rendering page: ${err}`;
		})

		await browser.close().catch(function (err) {
			throw `Error while rendering page: ${err}`;
		})

		return new Result(html, pdf);
	}

	close() {
		// Shutdown the image server
		this._image_server.close(function() {
			console.log('\nGracefully shut down image server.');
		});
	}

	// This converts the markdown string to it's HTML values # => h1 etc.
	_convertToHtml(text, title) {
		if(this._table_of_contents) text = '[toc]\n' + text;

		let md = GetMarkdownIt();
		let body = md.render(text);
		let doc = cheerio.load(body);
		let toc = doc('nav#table-of-contents').html();

		doc('nav#table-of-contents').remove();
		body = doc('body').html();

		let view = {
			title: title,
			style: this._style,
			toc: toc,
			content: body,
		};

		// Compile the template
		return mustache.render(this._template, view);
	}

	// ConvertImageRoutes: embed all images as base64, using only image_dir for local images
	async _convertImageRoutes(html) {
		console.log('[DEBUG] Starting image route conversion.');
		const $ = cheerio.load(html, { xmlMode: false, decodeEntities: false });
		const imgTags = $('img');
		console.log('[DEBUG] Found', imgTags.length, '<img> tags');
		for (let i = 0; i < imgTags.length; i++) {
			let img = imgTags[i];
			let src = $(img).attr('src');
			if (src) {
				if (src.match(/^https?:\/\//)) {
					// External image, use as is
					console.log(`[DEBUG] Embedding image: ${src} -> ${src}`);
					try {
						let image = await encodeImage(src);
						if (image) {
							$(img).attr('src', image);
							console.log('[DEBUG] Successfully embedded image as base64.');
						} else {
							console.log('[DEBUG] Image encoding returned null for', src);
						}
					} catch (error) {
						console.log('[DEBUG] ERROR embedding image:', error);
					}
					continue;
				}
				// Local image: strip image_dir prefix if present
				let imageDirName = this._image_dir.replace(/\\/g, '/').replace(/.*\//, '');
				let localSrc = src.replace(/^\.\//, '');
				if (localSrc.startsWith(imageDirName + '/')) {
					localSrc = localSrc.slice(imageDirName.length + 1);
				}
				let url = 'http://localhost:3000/' + localSrc;
				console.log(`[DEBUG] Embedding image: ${src} -> ${url}`);
				try {
					let image = await encodeImage(url);
					if (image) {
						$(img).attr('src', image);
						console.log('[DEBUG] Successfully embedded image as base64.');
					} else {
						console.log('[DEBUG] Image encoding returned null for', src);
					}
				} catch (error) {
					console.log('[DEBUG] ERROR embedding image:', error);
				}
			} else {
				console.log('[DEBUG] Skipping image with empty src');
			}
		}
		return $.html();
	}

	static nullCoalescing = nullCoalescing;
	static getFileContent = getFileContent;
}

class Result {
	html;
	pdf;

	constructor(html, pdf) {
		this.html = html;
		this.pdf = pdf;
	}

	writeHTML(file) {
		fs.writeFileSync(file, this.html);
	}

	writePDF(file) {
		fs.writeFileSync(file, this.pdf)
	}
}

exports = module.exports = MarkdownToPDF;
