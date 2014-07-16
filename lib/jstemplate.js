/*!
  * jstemplate: a light & fast js tamplate engine
  * License MIT (c) 岑安
  * 
  * Modify by azrael @ 2012/9/28
  * Modify by dorsy @ 2014/5/21
  *     支持$Tools方法
  */

;(function (name, definition) {
    if (typeof define === 'function') {
         define(definition);
    } else if (typeof module !== 'undefined') {
        module.exports = definition();
    } else {
        this[name] = definition();
    }
})('jstemplate', function () {

    var context = this,
        _cache = {},
        vars = 'var ',
        varsInTpl,
        codeArr = ''.trim ?
        ['$ret = "";', '$ret +=', ';', '$ret;']
        :['$ret = [];', '$ret.push("', '")', '$ret.join("");'],
        keys = ('break,case,catch,continue,debugger,default,delete,do,else,false,finally,for,function,if'
            + ',in,instanceof,new,null,return,switch,this,throw,true,try,typeof,var,void,while,with'
            // Reserved words
            + ',abstract,boolean,byte,char,class,const,double,enum,export,extends,final,float,goto'
            + ',implements,import,int,interface,long,native,package,private,protected,public,short'
            + ',static,super,synchronized,throws,transient,volatile'
            
            + ',window'
            + ',$ret,$default,$value,$Tool'

            // ECMA 5 - use strict
            + ',arguments,let,yield').split(','),
        keyMap = {};
        
    for (var i = 0, len = keys.length; i < len; i ++) {
        keyMap[keys[i]] = 1;
    }
        
    function _getCompileFn (source) {
        var openArr = source.split(jstemplate.openTag),
            tmpCode = '';
            
        for (var i = 0, len = openArr.length; i < len; i ++) {
            var c = openArr[i],
                cArr = c.split(jstemplate.closeTag);
            if (cArr.length === 1) {
                tmpCode += _html(cArr[0]) + '\n';
            } else {
                tmpCode += _js(cArr[0]);
                tmpCode += cArr[1] ? _html(cArr[1]) : '';
                tmpCode += '\n';
            }
        }

        var code = '$data = $data || {};\n' +
                $value.toString() + '\n' +
                $default.toString() + '\n' +
                vars + codeArr[0] + '\n' + tmpCode + 'return ' + codeArr[3];
        
        var fn = new Function('$data', '$Tool', code);

        return fn;
    }
    
    function _html (s) {
        s = s
        .replace(/('|"|\\)/g, '\\$1')
        // .replace(/\r/g, '\\r')
        // .replace(/\n/g, '\\n')
        ;
        
        s = codeArr[1] + '"' + s + '"' + codeArr[2];
        
        return s.replace(/\s+/g, ' ');// 把连续的空白去掉
    }
    
    function _js (s) {
        if (/^=/.test(s)) {
            s = codeArr[1] + ' $default(' + s.substring(1).replace(/[\s;]*$/, '') + ')' + codeArr[2];
        }

        dealWithVars(s);
        
        return s + '\n';
    }
    
    function dealWithVars (s) {
        s = s.replace(/\/\*.*?\*\/|'[^']*'|"[^"]*"|\/[^\/]+\/|\.[\$\w]+/g, '');

        var sarr = s.split(/[^\$\w\d]+/);

        for (var i = 0, len = sarr.length; i < len; i ++) {
            var c = sarr[i];
            if (!c || keyMap[c] || /^\d/.test(c)) {
                continue;
            }
            if(new RegExp("\\bvar\\b\\s+[\\s\\w,]*\\b"+ c + "\\b").test(s)){
                // 用var 声明的变量, 没必要替换
                varsInTpl[c] = 1;
                continue;
            }
            if (!varsInTpl[c]) {
                vars += (c + '= $value("' + c + '"),');
                varsInTpl[c] = 1;
            }
        }
    }

    function $default (v) {
        return typeof v === 'undefined' ? '' : v;
    }

    function $value (v){
        return $default( typeof $data[v] === 'undefined' ? this[v] : $data[v]);
    }

    

    function jstemplate (id, source, data) {
        if (typeof arguments[1] === 'object' && typeof arguments[2] === 'undefined') {
            data = source;
            source = id;
            id = null;
        }
        return (id && _cache[id]) ? _cache[id](data) : jstemplate.compile(id, source, data);
    }
    
    jstemplate.compile = function (id, source, data) {
        vars = 'var ';
        varsInTpl = {};

        var compileFn = _getCompileFn(source);

        if (id) {
            _cache[id] = compileFn;
        }
        //console.log(compileFn)
        return typeof data !== 'undefined' ? compileFn(data) : compileFn;
    };
    
    jstemplate.openTag = '<%';
    jstemplate.closeTag = '%>';
    
    context.jstemplate = jstemplate;
    return jstemplate;
  
});
