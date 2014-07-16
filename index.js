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

        var tmplFunc = jstemplate.compile(tmplId, compiled); // 
        compiled = tmplFunc.toString();

        var prefix = ';(function(){\n';
        var result = 'window.tpl=windo.tpl||{};\ntpl[\'' + tmplId + '\']=' + compiled + '\n';
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
