var path = require('path');
var fs = require('fs');
var EOL = require('os').EOL;

var through = require('through2');
var gutil = require('gulp-util');
var _ = require('lodash');
var jstemplate = require('./lib/jstemplate');

module.exports = function(options) {
    options = options || {};
    var basePath, mainPath, mainName, extName;

    var defaultOption = {
        namespace: '',
        processContent: function(src) {
            return src;
        }
    };

    options = _.extend(options, defaultOption);

    var processContent = options.processContent;
    var htmlRegexp = /<!--[\w\W\r\n]*?-->/img;
    var escaper = /\\|\u2028|\u2029/g;
    var escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\t': 't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    var win32 = process.platform === 'win32';
    var linefeed = win32 ? '\r\n' : '\n';

    function normalizelf(str) {
        return str.replace(/\r\n|\n/g, linefeed);
    };

    function normalize(str) {
        return win32 ? str.replace(/\\/g, '/') : str;
    };

    function createFile(name, content) {
        return new gutil.File({
            path: path.join(path.relative(basePath, mainPath), name),
            contents: new Buffer(content)
        })
    }

    function compile(content, push, callback) {
        // pre precess
        content = processContent(content);
        //去掉注释
        var compiled = content.replace(escaper, function(match) {
            return '\\' + escapes[match];
        }).replace(htmlRegexp, '');

        // 使用 jstemplate 进行预编译, 直接编译成 fucntion, 2014/4/2 by az
        var relativePath = path.relative(basePath, mainPath) + '/' + path.basename(mainName, extName);
        var namePrefix = options.namespace ? options.namespace + '_' : '';
        var tmplId = namePrefix + normalize(relativePath).replace(/\//ig, '_');
        
        try{
            var tmplFunc = jstemplate.compile(tmplId, compiled); // 
            compiled = tmplFunc.toString();
        }catch(err){
            gutil.log(gutil.colors.red('[' + mainName + '] template compile error: '+ err));
        }

        var prefix = ';(function(){\n';
        var result = 'window.tpl=window.tpl||{};\ntpl[\'' + tmplId + '\']=' + compiled + '\n';
        var subfix = '})();';

        var file = createFile(mainName, prefix + result + subfix);
        push(file);
        callback();

    };

    return through.obj(function(file, enc, callback) {
        if (file.isNull()) {
            this.push(file);
            callback();
        } else if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-jstemplate-compile', 'Streams are not supported!'));
            callback();
        } else {
            basePath = file.base;
            mainPath = path.dirname(file.path);
            mainName = path.basename(file.path);
            extName = path.extname(file.path);

            compile(String(file.contents), this.push.bind(this), callback);
        }
    });
};
      [
                /<meta[^\>]+content=['"]([^"']+)["']/gm,
                'Update the HTML with the new img filenames in meta tags'
            ]
        ],
        css: [
            [
                /(?:src=|url\(\s*)['"]?([^'"\)(\?|#)]+)['"]?\s*\)?/gm,
                'Update the CSS to reference our revved images'
            ]
        ],
        js: [
            [
                /(?:_urlrev\(\s*)['"]?([^'"\)(\?|#)]+)['"]?\s*\)?/gm,
                'Update the js _urlrev to reference our revved resources'
            ]
        ]
    };

    function defaultInHandler(m) {
        return m;
    }

    function defaultOutHandler(revFile, srcFile, tag) {
        return tag.replace(srcFile, url.resolve(options.urlPrefix, revFile));
    }

    function scriptHandler(revFile, srcFile, tag) {
        // handler inline
        if (srcFile.indexOf(inlineTag) > 0) {
            var content = readFile(revFile, options.scope);
            return '<script>' + content + '</script>';
        } else {
            return tag.replace(srcFile, url.resolve(options.urlPrefix, revFile));
        }
    }

    function cssHandler(revFile, srcFile, tag) {
        // handler inline
        if (srcFile.indexOf(inlineTag) > 0) {
            var content = readFile(revFile, options.scope);
            return '<style>' + content + '</style';
        } else {
            return tag.replace(srcFile, url.resolve(options.urlPrefix, revFile));
        }
    }

    function readFile(file, assetSearchPath) {
        var content = '';
        if (!Array.isArray(assetSearchPath)) {
            assetSearchPath = [assetSearchPath];
        }
        for (var i = 0; i < assetSearchPath.length; i++) {
            var fileurl = path.join(assetSearchPath[i], file);
            // console.log(fileurl)
            if (fs.existsSync(fileurl)) {
                content = fs.readFileSync(fileurl);
                break;
            }
        }
        return content;
    };

    function regexpQuote(str) {
        return (str + '').replace(/([.?*+\^$\[\]\\(){}|\-])/g, '\\$1');
    };

    function processPatterns(patterns, fn) {
        var result = [];
        _.flatten(patterns).forEach(function(pattern) {
            var exclusion = pattern.indexOf('!') === 0;
            if (exclusion) {
                pattern = pattern.slice(1);
            }
            // console.log(pattern)
            var matches = fn(pattern);
            if (exclusion) {
                result = _.difference(result, matches);
            } else {
                result = _.union(result, matches);
            }
        });
        // console.log(result)
        return result;
    };

    function createFile(name, content) {
        return new gutil.File({
            path: path.join(path.relative(basePath, mainPath), name),
            contents: new Buffer(content)
        })
    }

    function fileExpand(patterns, options) {
        options = options || {};

        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        if (patterns.length === 0) {
            return [];
        }

        return processPatterns(patterns, function(pattern) {
            return glob.sync(pattern, options);
        });
    };

    // modified from grunt usemin

    function getCandidatesFromMapping(file, searchPaths) {
        var log = gutil.log;
        var dirname = path.dirname(file);
        var candidates = [];
        var self = this;

        searchPaths.forEach(function(sp) {
            var key = path.normalize(path.join(sp, file));
            if (mapping[key]) {
                // We need to transform the actual file to a form that matches the one we received
                // For example if we received file 'foo/images/test.png' with searchPaths == ['dist'],
                // and found in mapping that 'dist/foo/images/test.png' has been renamed
                // 'dist/foo/images/test.1234.png' by grunt-rev, then we need to return
                // 'foo/images/test.1234.png'
                var cfile = path.basename(mapping[key]);
                candidates.push(dirname + '/' + cfile);
            }
        });

        return candidates;
    };

    function getCandidatesFromFS(file, searchPaths) {
        var extname = path.extname(file);
        var basename = path.basename(file, extname);
        var dirname = path.dirname(file);
        var hex = '[0-9a-fA-F]+';
        var regPrefix = '(' + hex + '-' + regexpQuote(basename) + ')';
        var regSuffix = '(' + regexpQuote(basename) + '-' + hex + regexpQuote(extname) + ')';
        var revvedRx = new RegExp(regPrefix + '|' + regSuffix);
        var candidates = [];
        var self = this;

        searchPaths.forEach(function(sp) {
            var searchString = path.join(sp, dirname, basename + '-*' + extname);
            var prefixSearchString = path.join(sp, dirname, '*-' + basename + extname);

            if (searchString.indexOf('#') === 0) {
                // patterns starting with # are treated as comments by the glob implementation which returns undefined,
                // which would cause an unhandled exception in self.expandfn below so the file is never written
                return;
            }
            var files = fileExpand([searchString, prefixSearchString]);

            // Keep only files that look like a revved file
            var goodFiles = files.filter(function(f) {
                return f.match(revvedRx);
            });

            // We must now remove the search path from the beginning, and add them to the
            // list of candidates
            goodFiles.forEach(function(gf) {
                var goodFileName = path.basename(gf);
                if (!file.match(/\//)) {
                    candidates.push(goodFileName);
                } else {
                    candidates.push(dirname + '/' + goodFileName);
                }
            });
        });

        return candidates;
    };

    function replaceWithRevved(type, lines, assetSearchPath) {
        var regexps = _defaultPatterns;
        var content = lines;
        // var log = gutil.log;
        var log = function() {};

        regexps[type].forEach(function(rxl) {
            var filterIn = rxl[2] || defaultInHandler;
            var filterOut = rxl[3] || defaultOutHandler;

            content = content.replace(rxl[0], function(match, src) {
                // Consider reference from site root
                var srcFile = filterIn(src);
                log('looking for revved version of ' + src + ' in ', assetSearchPath);

                var file = revFinder(srcFile.split('?')[0], assetSearchPath);
                var res = match;
                file = file.join('');
                if (!file) {
                    log('no revved version of ' + src + ' found!');
                    file = src;
                } else {
                    log('replace "' + src + '" to "' + file + '"');
                }
                res = filterOut(file, src, match);
                return res;
            });
        });

        return content;
    };

    function processHTML(content) {

        var html = [];
        var sections = content.split(endReg);
        for (var i = 0, l = sections.length; i < l; ++i) {
            if (sections[i].match(startReg)) {
                var section = sections[i].split(startReg);

                // content before <!-- build:
                html.push(section[0]);

                html.push(replaceWithRevved('html', section[1], options.scope));

            } else {
                html.push(sections[i]);
            }
        }

        return html.join('');
    }

    function proccessCSS(content) {
        return replaceWithRevved('css', content, options.scope);
    }

    function processJS(content) {
        return replaceWithRevved('js', content, options.scope);
    }

    function process(content, push, callback) {
        gutil.log('htmlrefs: process file ' + mainName);
        var handler = processHTML;
        if (extName == '.html') {
            handler = processHTML;
        } else if (extName == '.css') {
            handler = proccessCSS;
        } else if (extName == '.js') {
            handler = processJS;
        }

        var result = handler(content);

        var file = createFile(mainName, result);
        push(file);
        callback();
    };

    return through.obj(function(file, enc, callback) {
        if (file.isNull()) {
            this.push(file); // Do nothing if no contents
            callback();
        } else if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-htmlrefs', 'Streams are not supported!'));
            callback();
        } else {
            basePath = file.base;
            mainPath = path.dirname(file.path);
            mainName = path.basename(file.path);
            extName = path.extname(file.path);
            pathName = file.path;

            process(String(file.contents), this.push.bind(this), callback);
        }
    });
};
