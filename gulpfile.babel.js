import gulp from 'gulp';
import path from 'path';
import Metalsmith from 'metalsmith';
import _ from 'lodash';
import util from 'util';
import fs from 'fs';
import hbars from './gulp/handlebars';
import extract from "./gulp/extract";
import links from "./gulp/links";

let $g = require('gulp-load-plugins')();
let $m = require('load-metalsmith-plugins')();

gulp.task('symlink-src', () => {

	let safeSym = (src, dest) => {
		try {
			fs.lstatSync(dest);
		} catch(e) {
			fs.symlinkSync(src,dest);
		}
	}

	// symlink the landing pages/custom content from the docs repo for each section
	safeSym("../repos/docs/learn", "src/learn")
	safeSym("../repos/docs/reference", "src/reference")
	safeSym("../repos/docs/tools", "src/tools")
	safeSym("../repos/docs/beyond-code", "src/beyond-code")

	// link up other repo's docs folder into the src structure
	return gulp.src("./repos/*/docs/")
		.pipe($g.sym(repoToSrc, {force: true, relative: true}));
})

gulp.task('build', ['symlink-src'], done => {

	let templateOptions = {
		engine: "handlebars",
		partials: "partials",
		helpers: hbars.helpers,
	};

	Metalsmith(__dirname)
		.metadata({ host: "localhost:8000" })
		.use((f,m,d) => {
			hbars.setFileList(f);
			d();
		})
		.use(extract.examples)
		.use(require("./gulp/enhance"))
		.use($m.sass({
			outputStyle: "expanded",
			includePaths: [ "./node_modules", "./bower_components" ]
		}))
		.use($m.autoprefixer({ }))
		.use(renameReadme)
		.use($m.markdown())
		.use($m.inPlace(templateOptions))
		.use($m.layouts(templateOptions))
		.use(links.rewrite)
		.build(done);
});

gulp.task('serve', () => {
	gulp.src('./build')
    .pipe($g.webserver({
      livereload: true,
      open: "index.html",
    }));
});

function repoToSrc(file) {
	let project = file.relative.split(path.sep)[0];
	return path.join("src", project);
}

function renameReadme(files, metalsmith, done) {
	let toReplace = _(files).keys().filter(p => path.basename(p) === "readme.md").value();
	_.each(toReplace, p => {
		let newPath = path.join(path.dirname(p), "index.md");
		files[newPath] = files[p];
		delete files[p];
	});
	done();
}


function log(fn) {
	return function(files, metalsmith, done) {
		_.each(files, (f,p) => {
			console.log(`${p}: ${fn(f)}`);
		})
		done();
	};
}


// TODO:
//   live reload
//   rewrite link engine
//   example system
//   concat vendor.js
//   concat app.js
//   fingerprint assets
//   copy graphics files from solar module
//   run tests for link processor
//   


// Example design
//
// Each project that provides examples for horizon's endpoints will define a folder such as
// js-stellar-sdk/docs/horizon-examples/all-accounts.js
//
// the filename will be used for determining an examples file type
// metalsmith will be used to populate a metadata field with all examples, indexed by endpoint name
// each endpoint file can extract its examples using its name, then render them directly
//
