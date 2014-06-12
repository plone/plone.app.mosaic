/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.14 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.14',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i == 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("requirejs", function(){});

/*!
 * jQuery JavaScript Library v1.8.3
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: Tue Nov 13 2012 08:20:33 GMT-0500 (Eastern Standard Time)
 */
(function( window, undefined ) {
var
        // A central reference to the root jQuery(document)
        rootjQuery,

        // The deferred used on DOM ready
        readyList,

        // Use the correct document accordingly with window argument (sandbox)
        document = window.document,
        location = window.location,
        navigator = window.navigator,

        // Map over jQuery in case of overwrite
        _jQuery = window.jQuery,

        // Map over the $ in case of overwrite
        _$ = window.$,

        // Save a reference to some core methods
        core_push = Array.prototype.push,
        core_slice = Array.prototype.slice,
        core_indexOf = Array.prototype.indexOf,
        core_toString = Object.prototype.toString,
        core_hasOwn = Object.prototype.hasOwnProperty,
        core_trim = String.prototype.trim,

        // Define a local copy of jQuery
        jQuery = function( selector, context ) {
                // The jQuery object is actually just the init constructor 'enhanced'
                return new jQuery.fn.init( selector, context, rootjQuery );
        },

        // Used for matching numbers
        core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,

        // Used for detecting and trimming whitespace
        core_rnotwhite = /\S/,
        core_rspace = /\s+/,

        // Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
        rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

        // A simple way to check for HTML strings
        // Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
        rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

        // Match a standalone tag
        rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

        // JSON RegExp
        rvalidchars = /^[\],:{}\s]*$/,
        rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
        rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
        rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,

        // Matches dashed string for camelizing
        rmsPrefix = /^-ms-/,
        rdashAlpha = /-([\da-z])/gi,

        // Used by jQuery.camelCase as callback to replace()
        fcamelCase = function( all, letter ) {
                return ( letter + "" ).toUpperCase();
        },

        // The ready event handler and self cleanup method
        DOMContentLoaded = function() {
                if ( document.addEventListener ) {
                        document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
                        jQuery.ready();
                } else if ( document.readyState === "complete" ) {
                        // we're here because readyState === "complete" in oldIE
                        // which is good enough for us to call the dom ready!
                        document.detachEvent( "onreadystatechange", DOMContentLoaded );
                        jQuery.ready();
                }
        },

        // [[Class]] -> type pairs
        class2type = {};

jQuery.fn = jQuery.prototype = {
        constructor: jQuery,
        init: function( selector, context, rootjQuery ) {
                var match, elem, ret, doc;

                // Handle $(""), $(null), $(undefined), $(false)
                if ( !selector ) {
                        return this;
                }

                // Handle $(DOMElement)
                if ( selector.nodeType ) {
                        this.context = this[0] = selector;
                        this.length = 1;
                        return this;
                }

                // Handle HTML strings
                if ( typeof selector === "string" ) {
                        if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
                                // Assume that strings that start and end with <> are HTML and skip the regex check
                                match = [ null, selector, null ];

                        } else {
                                match = rquickExpr.exec( selector );
                        }

                        // Match html or make sure no context is specified for #id
                        if ( match && (match[1] || !context) ) {

                                // HANDLE: $(html) -> $(array)
                                if ( match[1] ) {
                                        context = context instanceof jQuery ? context[0] : context;
                                        doc = ( context && context.nodeType ? context.ownerDocument || context : document );

                                        // scripts is true for back-compat
                                        selector = jQuery.parseHTML( match[1], doc, true );
                                        if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
                                                this.attr.call( selector, context, true );
                                        }

                                        return jQuery.merge( this, selector );

                                // HANDLE: $(#id)
                                } else {
                                        elem = document.getElementById( match[2] );

                                        // Check parentNode to catch when Blackberry 4.6 returns
                                        // nodes that are no longer in the document #6963
                                        if ( elem && elem.parentNode ) {
                                                // Handle the case where IE and Opera return items
                                                // by name instead of ID
                                                if ( elem.id !== match[2] ) {
                                                        return rootjQuery.find( selector );
                                                }

                                                // Otherwise, we inject the element directly into the jQuery object
                                                this.length = 1;
                                                this[0] = elem;
                                        }

                                        this.context = document;
                                        this.selector = selector;
                                        return this;
                                }

                        // HANDLE: $(expr, $(...))
                        } else if ( !context || context.jquery ) {
                                return ( context || rootjQuery ).find( selector );

                        // HANDLE: $(expr, context)
                        // (which is just equivalent to: $(context).find(expr)
                        } else {
                                return this.constructor( context ).find( selector );
                        }

                // HANDLE: $(function)
                // Shortcut for document ready
                } else if ( jQuery.isFunction( selector ) ) {
                        return rootjQuery.ready( selector );
                }

                if ( selector.selector !== undefined ) {
                        this.selector = selector.selector;
                        this.context = selector.context;
                }

                return jQuery.makeArray( selector, this );
        },

        // Start with an empty selector
        selector: "",

        // The current version of jQuery being used
        jquery: "1.8.3",

        // The default length of a jQuery object is 0
        length: 0,

        // The number of elements contained in the matched element set
        size: function() {
                return this.length;
        },

        toArray: function() {
                return core_slice.call( this );
        },

        // Get the Nth element in the matched element set OR
        // Get the whole matched element set as a clean array
        get: function( num ) {
                return num == null ?

                        // Return a 'clean' array
                        this.toArray() :

                        // Return just the object
                        ( num < 0 ? this[ this.length + num ] : this[ num ] );
        },

        // Take an array of elements and push it onto the stack
        // (returning the new matched element set)
        pushStack: function( elems, name, selector ) {

                // Build a new jQuery matched element set
                var ret = jQuery.merge( this.constructor(), elems );

                // Add the old object onto the stack (as a reference)
                ret.prevObject = this;

                ret.context = this.context;

                if ( name === "find" ) {
                        ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
                } else if ( name ) {
                        ret.selector = this.selector + "." + name + "(" + selector + ")";
                }

                // Return the newly-formed element set
                return ret;
        },

        // Execute a callback for every element in the matched set.
        // (You can seed the arguments with an array of args, but this is
        // only used internally.)
        each: function( callback, args ) {
                return jQuery.each( this, callback, args );
        },

        ready: function( fn ) {
                // Add the callback
                jQuery.ready.promise().done( fn );

                return this;
        },

        eq: function( i ) {
                i = +i;
                return i === -1 ?
                        this.slice( i ) :
                        this.slice( i, i + 1 );
        },

        first: function() {
                return this.eq( 0 );
        },

        last: function() {
                return this.eq( -1 );
        },

        slice: function() {
                return this.pushStack( core_slice.apply( this, arguments ),
                        "slice", core_slice.call(arguments).join(",") );
        },

        map: function( callback ) {
                return this.pushStack( jQuery.map(this, function( elem, i ) {
                        return callback.call( elem, i, elem );
                }));
        },

        end: function() {
                return this.prevObject || this.constructor(null);
        },

        // For internal use only.
        // Behaves like an Array's method, not like a jQuery method.
        push: core_push,
        sort: [].sort,
        splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
        var options, name, src, copy, copyIsArray, clone,
                target = arguments[0] || {},
                i = 1,
                length = arguments.length,
                deep = false;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
                deep = target;
                target = arguments[1] || {};
                // skip the boolean and the target
                i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
                target = {};
        }

        // extend jQuery itself if only one argument is passed
        if ( length === i ) {
                target = this;
                --i;
        }

        for ( ; i < length; i++ ) {
                // Only deal with non-null/undefined values
                if ( (options = arguments[ i ]) != null ) {
                        // Extend the base object
                        for ( name in options ) {
                                src = target[ name ];
                                copy = options[ name ];

                                // Prevent never-ending loop
                                if ( target === copy ) {
                                        continue;
                                }

                                // Recurse if we're merging plain objects or arrays
                                if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
                                        if ( copyIsArray ) {
                                                copyIsArray = false;
                                                clone = src && jQuery.isArray(src) ? src : [];

                                        } else {
                                                clone = src && jQuery.isPlainObject(src) ? src : {};
                                        }

                                        // Never move original objects, clone them
                                        target[ name ] = jQuery.extend( deep, clone, copy );

                                // Don't bring in undefined values
                                } else if ( copy !== undefined ) {
                                        target[ name ] = copy;
                                }
                        }
                }
        }

        // Return the modified object
        return target;
};

jQuery.extend({
        noConflict: function( deep ) {
                if ( window.$ === jQuery ) {
                        window.$ = _$;
                }

                if ( deep && window.jQuery === jQuery ) {
                        window.jQuery = _jQuery;
                }

                return jQuery;
        },

        // Is the DOM ready to be used? Set to true once it occurs.
        isReady: false,

        // A counter to track how many items to wait for before
        // the ready event fires. See #6781
        readyWait: 1,

        // Hold (or release) the ready event
        holdReady: function( hold ) {
                if ( hold ) {
                        jQuery.readyWait++;
                } else {
                        jQuery.ready( true );
                }
        },

        // Handle when the DOM is ready
        ready: function( wait ) {

                // Abort if there are pending holds or we're already ready
                if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
                        return;
                }

                // Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
                if ( !document.body ) {
                        return setTimeout( jQuery.ready, 1 );
                }

                // Remember that the DOM is ready
                jQuery.isReady = true;

                // If a normal DOM Ready event fired, decrement, and wait if need be
                if ( wait !== true && --jQuery.readyWait > 0 ) {
                        return;
                }

                // If there are functions bound, to execute
                readyList.resolveWith( document, [ jQuery ] );

                // Trigger any bound ready events
                if ( jQuery.fn.trigger ) {
                        jQuery( document ).trigger("ready").off("ready");
                }
        },

        // See test/unit/core.js for details concerning isFunction.
        // Since version 1.3, DOM methods and functions like alert
        // aren't supported. They return false on IE (#2968).
        isFunction: function( obj ) {
                return jQuery.type(obj) === "function";
        },

        isArray: Array.isArray || function( obj ) {
                return jQuery.type(obj) === "array";
        },

        isWindow: function( obj ) {
                return obj != null && obj == obj.window;
        },

        isNumeric: function( obj ) {
                return !isNaN( parseFloat(obj) ) && isFinite( obj );
        },

        type: function( obj ) {
                return obj == null ?
                        String( obj ) :
                        class2type[ core_toString.call(obj) ] || "object";
        },

        isPlainObject: function( obj ) {
                // Must be an Object.
                // Because of IE, we also have to check the presence of the constructor property.
                // Make sure that DOM nodes and window objects don't pass through, as well
                if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
                        return false;
                }

                try {
                        // Not own constructor property must be Object
                        if ( obj.constructor &&
                                !core_hasOwn.call(obj, "constructor") &&
                                !core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
                                return false;
                        }
                } catch ( e ) {
                        // IE8,9 Will throw exceptions on certain host objects #9897
                        return false;
                }

                // Own properties are enumerated firstly, so to speed up,
                // if last one is own, then all properties are own.

                var key;
                for ( key in obj ) {}

                return key === undefined || core_hasOwn.call( obj, key );
        },

        isEmptyObject: function( obj ) {
                var name;
                for ( name in obj ) {
                        return false;
                }
                return true;
        },

        error: function( msg ) {
                throw new Error( msg );
        },

        // data: string of html
        // context (optional): If specified, the fragment will be created in this context, defaults to document
        // scripts (optional): If true, will include scripts passed in the html string
        parseHTML: function( data, context, scripts ) {
                var parsed;
                if ( !data || typeof data !== "string" ) {
                        return null;
                }
                if ( typeof context === "boolean" ) {
                        scripts = context;
                        context = 0;
                }
                context = context || document;

                // Single tag
                if ( (parsed = rsingleTag.exec( data )) ) {
                        return [ context.createElement( parsed[1] ) ];
                }

                parsed = jQuery.buildFragment( [ data ], context, scripts ? null : [] );
                return jQuery.merge( [],
                        (parsed.cacheable ? jQuery.clone( parsed.fragment ) : parsed.fragment).childNodes );
        },

        parseJSON: function( data ) {
                if ( !data || typeof data !== "string") {
                        return null;
                }

                // Make sure leading/trailing whitespace is removed (IE can't handle it)
                data = jQuery.trim( data );

                // Attempt to parse using the native JSON parser first
                if ( window.JSON && window.JSON.parse ) {
                        return window.JSON.parse( data );
                }

                // Make sure the incoming data is actual JSON
                // Logic borrowed from http://json.org/json2.js
                if ( rvalidchars.test( data.replace( rvalidescape, "@" )
                        .replace( rvalidtokens, "]" )
                        .replace( rvalidbraces, "")) ) {

                        return ( new Function( "return " + data ) )();

                }
                jQuery.error( "Invalid JSON: " + data );
        },

        // Cross-browser xml parsing
        parseXML: function( data ) {
                var xml, tmp;
                if ( !data || typeof data !== "string" ) {
                        return null;
                }
                try {
                        if ( window.DOMParser ) { // Standard
                                tmp = new DOMParser();
                                xml = tmp.parseFromString( data , "text/xml" );
                        } else { // IE
                                xml = new ActiveXObject( "Microsoft.XMLDOM" );
                                xml.async = "false";
                                xml.loadXML( data );
                        }
                } catch( e ) {
                        xml = undefined;
                }
                if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
                        jQuery.error( "Invalid XML: " + data );
                }
                return xml;
        },

        noop: function() {},

        // Evaluates a script in a global context
        // Workarounds based on findings by Jim Driscoll
        // http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
        globalEval: function( data ) {
                if ( data && core_rnotwhite.test( data ) ) {
                        // We use execScript on Internet Explorer
                        // We use an anonymous function so that context is window
                        // rather than jQuery in Firefox
                        ( window.execScript || function( data ) {
                                window[ "eval" ].call( window, data );
                        } )( data );
                }
        },

        // Convert dashed to camelCase; used by the css and data modules
        // Microsoft forgot to hump their vendor prefix (#9572)
        camelCase: function( string ) {
                return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
        },

        nodeName: function( elem, name ) {
                return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
        },

        // args is for internal usage only
        each: function( obj, callback, args ) {
                var name,
                        i = 0,
                        length = obj.length,
                        isObj = length === undefined || jQuery.isFunction( obj );

                if ( args ) {
                        if ( isObj ) {
                                for ( name in obj ) {
                                        if ( callback.apply( obj[ name ], args ) === false ) {
                                                break;
                                        }
                                }
                        } else {
                                for ( ; i < length; ) {
                                        if ( callback.apply( obj[ i++ ], args ) === false ) {
                                                break;
                                        }
                                }
                        }

                // A special, fast, case for the most common use of each
                } else {
                        if ( isObj ) {
                                for ( name in obj ) {
                                        if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
                                                break;
                                        }
                                }
                        } else {
                                for ( ; i < length; ) {
                                        if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
                                                break;
                                        }
                                }
                        }
                }

                return obj;
        },

        // Use native String.trim function wherever possible
        trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
                function( text ) {
                        return text == null ?
                                "" :
                                core_trim.call( text );
                } :

                // Otherwise use our own trimming functionality
                function( text ) {
                        return text == null ?
                                "" :
                                ( text + "" ).replace( rtrim, "" );
                },

        // results is for internal usage only
        makeArray: function( arr, results ) {
                var type,
                        ret = results || [];

                if ( arr != null ) {
                        // The window, strings (and functions) also have 'length'
                        // Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
                        type = jQuery.type( arr );

                        if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( arr ) ) {
                                core_push.call( ret, arr );
                        } else {
                                jQuery.merge( ret, arr );
                        }
                }

                return ret;
        },

        inArray: function( elem, arr, i ) {
                var len;

                if ( arr ) {
                        if ( core_indexOf ) {
                                return core_indexOf.call( arr, elem, i );
                        }

                        len = arr.length;
                        i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

                        for ( ; i < len; i++ ) {
                                // Skip accessing in sparse arrays
                                if ( i in arr && arr[ i ] === elem ) {
                                        return i;
                                }
                        }
                }

                return -1;
        },

        merge: function( first, second ) {
                var l = second.length,
                        i = first.length,
                        j = 0;

                if ( typeof l === "number" ) {
                        for ( ; j < l; j++ ) {
                                first[ i++ ] = second[ j ];
                        }

                } else {
                        while ( second[j] !== undefined ) {
                                first[ i++ ] = second[ j++ ];
                        }
                }

                first.length = i;

                return first;
        },

        grep: function( elems, callback, inv ) {
                var retVal,
                        ret = [],
                        i = 0,
                        length = elems.length;
                inv = !!inv;

                // Go through the array, only saving the items
                // that pass the validator function
                for ( ; i < length; i++ ) {
                        retVal = !!callback( elems[ i ], i );
                        if ( inv !== retVal ) {
                                ret.push( elems[ i ] );
                        }
                }

                return ret;
        },

        // arg is for internal usage only
        map: function( elems, callback, arg ) {
                var value, key,
                        ret = [],
                        i = 0,
                        length = elems.length,
                        // jquery objects are treated as arrays
                        isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

                // Go through the array, translating each of the items to their
                if ( isArray ) {
                        for ( ; i < length; i++ ) {
                                value = callback( elems[ i ], i, arg );

                                if ( value != null ) {
                                        ret[ ret.length ] = value;
                                }
                        }

                // Go through every key on the object,
                } else {
                        for ( key in elems ) {
                                value = callback( elems[ key ], key, arg );

                                if ( value != null ) {
                                        ret[ ret.length ] = value;
                                }
                        }
                }

                // Flatten any nested arrays
                return ret.concat.apply( [], ret );
        },

        // A global GUID counter for objects
        guid: 1,

        // Bind a function to a context, optionally partially applying any
        // arguments.
        proxy: function( fn, context ) {
                var tmp, args, proxy;

                if ( typeof context === "string" ) {
                        tmp = fn[ context ];
                        context = fn;
                        fn = tmp;
                }

                // Quick check to determine if target is callable, in the spec
                // this throws a TypeError, but we will just return undefined.
                if ( !jQuery.isFunction( fn ) ) {
                        return undefined;
                }

                // Simulated bind
                args = core_slice.call( arguments, 2 );
                proxy = function() {
                        return fn.apply( context, args.concat( core_slice.call( arguments ) ) );
                };

                // Set the guid of unique handler to the same of original handler, so it can be removed
                proxy.guid = fn.guid = fn.guid || jQuery.guid++;

                return proxy;
        },

        // Multifunctional method to get and set values of a collection
        // The value/s can optionally be executed if it's a function
        access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
                var exec,
                        bulk = key == null,
                        i = 0,
                        length = elems.length;

                // Sets many values
                if ( key && typeof key === "object" ) {
                        for ( i in key ) {
                                jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
                        }
                        chainable = 1;

                // Sets one value
                } else if ( value !== undefined ) {
                        // Optionally, function values get executed if exec is true
                        exec = pass === undefined && jQuery.isFunction( value );

                        if ( bulk ) {
                                // Bulk operations only iterate when executing function values
                                if ( exec ) {
                                        exec = fn;
                                        fn = function( elem, key, value ) {
                                                return exec.call( jQuery( elem ), value );
                                        };

                                // Otherwise they run against the entire set
                                } else {
                                        fn.call( elems, value );
                                        fn = null;
                                }
                        }

                        if ( fn ) {
                                for (; i < length; i++ ) {
                                        fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
                                }
                        }

                        chainable = 1;
                }

                return chainable ?
                        elems :

                        // Gets
                        bulk ?
                                fn.call( elems ) :
                                length ? fn( elems[0], key ) : emptyGet;
        },

        now: function() {
                return ( new Date() ).getTime();
        }
});

jQuery.ready.promise = function( obj ) {
        if ( !readyList ) {

                readyList = jQuery.Deferred();

                // Catch cases where $(document).ready() is called after the browser event has already occurred.
                // we once tried to use readyState "interactive" here, but it caused issues like the one
                // discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
                if ( document.readyState === "complete" ) {
                        // Handle it asynchronously to allow scripts the opportunity to delay ready
                        setTimeout( jQuery.ready, 1 );

                // Standards-based browsers support DOMContentLoaded
                } else if ( document.addEventListener ) {
                        // Use the handy event callback
                        document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

                        // A fallback to window.onload, that will always work
                        window.addEventListener( "load", jQuery.ready, false );

                // If IE event model is used
                } else {
                        // Ensure firing before onload, maybe late but safe also for iframes
                        document.attachEvent( "onreadystatechange", DOMContentLoaded );

                        // A fallback to window.onload, that will always work
                        window.attachEvent( "onload", jQuery.ready );

                        // If IE and not a frame
                        // continually check to see if the document is ready
                        var top = false;

                        try {
                                top = window.frameElement == null && document.documentElement;
                        } catch(e) {}

                        if ( top && top.doScroll ) {
                                (function doScrollCheck() {
                                        if ( !jQuery.isReady ) {

                                                try {
                                                        // Use the trick by Diego Perini
                                                        // http://javascript.nwbox.com/IEContentLoaded/
                                                        top.doScroll("left");
                                                } catch(e) {
                                                        return setTimeout( doScrollCheck, 50 );
                                                }

                                                // and execute any waiting functions
                                                jQuery.ready();
                                        }
                                })();
                        }
                }
        }
        return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
        class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
        var object = optionsCache[ options ] = {};
        jQuery.each( options.split( core_rspace ), function( _, flag ) {
                object[ flag ] = true;
        });
        return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *      options: an optional list of space-separated options that will change how
 *                      the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *      once:                   will ensure the callback list can only be fired once (like a Deferred)
 *
 *      memory:                 will keep track of previous values and will call any callback added
 *                                      after the list has been fired right away with the latest "memorized"
 *                                      values (like a Deferred)
 *
 *      unique:                 will ensure a callback can only be added once (no duplicate in the list)
 *
 *      stopOnFalse:    interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

        // Convert options from String-formatted to Object-formatted if needed
        // (we check in cache first)
        options = typeof options === "string" ?
                ( optionsCache[ options ] || createOptions( options ) ) :
                jQuery.extend( {}, options );

        var // Last fire value (for non-forgettable lists)
                memory,
                // Flag to know if list was already fired
                fired,
                // Flag to know if list is currently firing
                firing,
                // First callback to fire (used internally by add and fireWith)
                firingStart,
                // End of the loop when firing
                firingLength,
                // Index of currently firing callback (modified by remove if needed)
                firingIndex,
                // Actual callback list
                list = [],
                // Stack of fire calls for repeatable lists
                stack = !options.once && [],
                // Fire callbacks
                fire = function( data ) {
                        memory = options.memory && data;
                        fired = true;
                        firingIndex = firingStart || 0;
                        firingStart = 0;
                        firingLength = list.length;
                        firing = true;
                        for ( ; list && firingIndex < firingLength; firingIndex++ ) {
                                if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
                                        memory = false; // To prevent further calls using add
                                        break;
                                }
                        }
                        firing = false;
                        if ( list ) {
                                if ( stack ) {
                                        if ( stack.length ) {
                                                fire( stack.shift() );
                                        }
                                } else if ( memory ) {
                                        list = [];
                                } else {
                                        self.disable();
                                }
                        }
                },
                // Actual Callbacks object
                self = {
                        // Add a callback or a collection of callbacks to the list
                        add: function() {
                                if ( list ) {
                                        // First, we save the current length
                                        var start = list.length;
                                        (function add( args ) {
                                                jQuery.each( args, function( _, arg ) {
                                                        var type = jQuery.type( arg );
                                                        if ( type === "function" ) {
                                                                if ( !options.unique || !self.has( arg ) ) {
                                                                        list.push( arg );
                                                                }
                                                        } else if ( arg && arg.length && type !== "string" ) {
                                                                // Inspect recursively
                                                                add( arg );
                                                        }
                                                });
                                        })( arguments );
                                        // Do we need to add the callbacks to the
                                        // current firing batch?
                                        if ( firing ) {
                                                firingLength = list.length;
                                        // With memory, if we're not firing then
                                        // we should call right away
                                        } else if ( memory ) {
                                                firingStart = start;
                                                fire( memory );
                                        }
                                }
                                return this;
                        },
                        // Remove a callback from the list
                        remove: function() {
                                if ( list ) {
                                        jQuery.each( arguments, function( _, arg ) {
                                                var index;
                                                while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
                                                        list.splice( index, 1 );
                                                        // Handle firing indexes
                                                        if ( firing ) {
                                                                if ( index <= firingLength ) {
                                                                        firingLength--;
                                                                }
                                                                if ( index <= firingIndex ) {
                                                                        firingIndex--;
                                                                }
                                                        }
                                                }
                                        });
                                }
                                return this;
                        },
                        // Control if a given callback is in the list
                        has: function( fn ) {
                                return jQuery.inArray( fn, list ) > -1;
                        },
                        // Remove all callbacks from the list
                        empty: function() {
                                list = [];
                                return this;
                        },
                        // Have the list do nothing anymore
                        disable: function() {
                                list = stack = memory = undefined;
                                return this;
                        },
                        // Is it disabled?
                        disabled: function() {
                                return !list;
                        },
                        // Lock the list in its current state
                        lock: function() {
                                stack = undefined;
                                if ( !memory ) {
                                        self.disable();
                                }
                                return this;
                        },
                        // Is it locked?
                        locked: function() {
                                return !stack;
                        },
                        // Call all callbacks with the given context and arguments
                        fireWith: function( context, args ) {
                                args = args || [];
                                args = [ context, args.slice ? args.slice() : args ];
                                if ( list && ( !fired || stack ) ) {
                                        if ( firing ) {
                                                stack.push( args );
                                        } else {
                                                fire( args );
                                        }
                                }
                                return this;
                        },
                        // Call all the callbacks with the given arguments
                        fire: function() {
                                self.fireWith( this, arguments );
                                return this;
                        },
                        // To know if the callbacks have already been called at least once
                        fired: function() {
                                return !!fired;
                        }
                };

        return self;
};
jQuery.extend({

        Deferred: function( func ) {
                var tuples = [
                                // action, add listener, listener list, final state
                                [ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
                                [ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
                                [ "notify", "progress", jQuery.Callbacks("memory") ]
                        ],
                        state = "pending",
                        promise = {
                                state: function() {
                                        return state;
                                },
                                always: function() {
                                        deferred.done( arguments ).fail( arguments );
                                        return this;
                                },
                                then: function( /* fnDone, fnFail, fnProgress */ ) {
                                        var fns = arguments;
                                        return jQuery.Deferred(function( newDefer ) {
                                                jQuery.each( tuples, function( i, tuple ) {
                                                        var action = tuple[ 0 ],
                                                                fn = fns[ i ];
                                                        // deferred[ done | fail | progress ] for forwarding actions to newDefer
                                                        deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
                                                                function() {
                                                                        var returned = fn.apply( this, arguments );
                                                                        if ( returned && jQuery.isFunction( returned.promise ) ) {
                                                                                returned.promise()
                                                                                        .done( newDefer.resolve )
                                                                                        .fail( newDefer.reject )
                                                                                        .progress( newDefer.notify );
                                                                        } else {
                                                                                newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
                                                                        }
                                                                } :
                                                                newDefer[ action ]
                                                        );
                                                });
                                                fns = null;
                                        }).promise();
                                },
                                // Get a promise for this deferred
                                // If obj is provided, the promise aspect is added to the object
                                promise: function( obj ) {
                                        return obj != null ? jQuery.extend( obj, promise ) : promise;
                                }
                        },
                        deferred = {};

                // Keep pipe for back-compat
                promise.pipe = promise.then;

                // Add list-specific methods
                jQuery.each( tuples, function( i, tuple ) {
                        var list = tuple[ 2 ],
                                stateString = tuple[ 3 ];

                        // promise[ done | fail | progress ] = list.add
                        promise[ tuple[1] ] = list.add;

                        // Handle state
                        if ( stateString ) {
                                list.add(function() {
                                        // state = [ resolved | rejected ]
                                        state = stateString;

                                // [ reject_list | resolve_list ].disable; progress_list.lock
                                }, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
                        }

                        // deferred[ resolve | reject | notify ] = list.fire
                        deferred[ tuple[0] ] = list.fire;
                        deferred[ tuple[0] + "With" ] = list.fireWith;
                });

                // Make the deferred a promise
                promise.promise( deferred );

                // Call given func if any
                if ( func ) {
                        func.call( deferred, deferred );
                }

                // All done!
                return deferred;
        },

        // Deferred helper
        when: function( subordinate /* , ..., subordinateN */ ) {
                var i = 0,
                        resolveValues = core_slice.call( arguments ),
                        length = resolveValues.length,

                        // the count of uncompleted subordinates
                        remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

                        // the master Deferred. If resolveValues consist of only a single Deferred, just use that.
                        deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

                        // Update function for both resolve and progress values
                        updateFunc = function( i, contexts, values ) {
                                return function( value ) {
                                        contexts[ i ] = this;
                                        values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
                                        if( values === progressValues ) {
                                                deferred.notifyWith( contexts, values );
                                        } else if ( !( --remaining ) ) {
                                                deferred.resolveWith( contexts, values );
                                        }
                                };
                        },

                        progressValues, progressContexts, resolveContexts;

                // add listeners to Deferred subordinates; treat others as resolved
                if ( length > 1 ) {
                        progressValues = new Array( length );
                        progressContexts = new Array( length );
                        resolveContexts = new Array( length );
                        for ( ; i < length; i++ ) {
                                if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
                                        resolveValues[ i ].promise()
                                                .done( updateFunc( i, resolveContexts, resolveValues ) )
                                                .fail( deferred.reject )
                                                .progress( updateFunc( i, progressContexts, progressValues ) );
                                } else {
                                        --remaining;
                                }
                        }
                }

                // if we're not waiting on anything, resolve the master
                if ( !remaining ) {
                        deferred.resolveWith( resolveContexts, resolveValues );
                }

                return deferred.promise();
        }
});
jQuery.support = (function() {

        var support,
                all,
                a,
                select,
                opt,
                input,
                fragment,
                eventName,
                i,
                isSupported,
                clickFn,
                div = document.createElement("div");

        // Setup
        div.setAttribute( "className", "t" );
        div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

        // Support tests won't run in some limited or non-browser environments
        all = div.getElementsByTagName("*");
        a = div.getElementsByTagName("a")[ 0 ];
        if ( !all || !a || !all.length ) {
                return {};
        }

        // First batch of tests
        select = document.createElement("select");
        opt = select.appendChild( document.createElement("option") );
        input = div.getElementsByTagName("input")[ 0 ];

        a.style.cssText = "top:1px;float:left;opacity:.5";
        support = {
                // IE strips leading whitespace when .innerHTML is used
                leadingWhitespace: ( div.firstChild.nodeType === 3 ),

                // Make sure that tbody elements aren't automatically inserted
                // IE will insert them into empty tables
                tbody: !div.getElementsByTagName("tbody").length,

                // Make sure that link elements get serialized correctly by innerHTML
                // This requires a wrapper element in IE
                htmlSerialize: !!div.getElementsByTagName("link").length,

                // Get the style information from getAttribute
                // (IE uses .cssText instead)
                style: /top/.test( a.getAttribute("style") ),

                // Make sure that URLs aren't manipulated
                // (IE normalizes it by default)
                hrefNormalized: ( a.getAttribute("href") === "/a" ),

                // Make sure that element opacity exists
                // (IE uses filter instead)
                // Use a regex to work around a WebKit issue. See #5145
                opacity: /^0.5/.test( a.style.opacity ),

                // Verify style float existence
                // (IE uses styleFloat instead of cssFloat)
                cssFloat: !!a.style.cssFloat,

                // Make sure that if no value is specified for a checkbox
                // that it defaults to "on".
                // (WebKit defaults to "" instead)
                checkOn: ( input.value === "on" ),

                // Make sure that a selected-by-default option has a working selected property.
                // (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
                optSelected: opt.selected,

                // Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
                getSetAttribute: div.className !== "t",

                // Tests for enctype support on a form (#6743)
                enctype: !!document.createElement("form").enctype,

                // Makes sure cloning an html5 element does not cause problems
                // Where outerHTML is undefined, this still works
                html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

                // jQuery.support.boxModel DEPRECATED in 1.8 since we don't support Quirks Mode
                boxModel: ( document.compatMode === "CSS1Compat" ),

                // Will be defined later
                submitBubbles: true,
                changeBubbles: true,
                focusinBubbles: false,
                deleteExpando: true,
                noCloneEvent: true,
                inlineBlockNeedsLayout: false,
                shrinkWrapBlocks: false,
                reliableMarginRight: true,
                boxSizingReliable: true,
                pixelPosition: false
        };

        // Make sure checked status is properly cloned
        input.checked = true;
        support.noCloneChecked = input.cloneNode( true ).checked;

        // Make sure that the options inside disabled selects aren't marked as disabled
        // (WebKit marks them as disabled)
        select.disabled = true;
        support.optDisabled = !opt.disabled;

        // Test to see if it's possible to delete an expando from an element
        // Fails in Internet Explorer
        try {
                delete div.test;
        } catch( e ) {
                support.deleteExpando = false;
        }

        if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
                div.attachEvent( "onclick", clickFn = function() {
                        // Cloning a node shouldn't copy over any
                        // bound event handlers (IE does this)
                        support.noCloneEvent = false;
                });
                div.cloneNode( true ).fireEvent("onclick");
                div.detachEvent( "onclick", clickFn );
        }

        // Check if a radio maintains its value
        // after being appended to the DOM
        input = document.createElement("input");
        input.value = "t";
        input.setAttribute( "type", "radio" );
        support.radioValue = input.value === "t";

        input.setAttribute( "checked", "checked" );

        // #11217 - WebKit loses check when the name is after the checked attribute
        input.setAttribute( "name", "t" );

        div.appendChild( input );
        fragment = document.createDocumentFragment();
        fragment.appendChild( div.lastChild );

        // WebKit doesn't clone checked state correctly in fragments
        support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

        // Check if a disconnected checkbox will retain its checked
        // value of true after appended to the DOM (IE6/7)
        support.appendChecked = input.checked;

        fragment.removeChild( input );
        fragment.appendChild( div );

        // Technique from Juriy Zaytsev
        // http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
        // We only care about the case where non-standard event systems
        // are used, namely in IE. Short-circuiting here helps us to
        // avoid an eval call (in setAttribute) which can cause CSP
        // to go haywire. See: https://developer.mozilla.org/en/Security/CSP
        if ( div.attachEvent ) {
                for ( i in {
                        submit: true,
                        change: true,
                        focusin: true
                }) {
                        eventName = "on" + i;
                        isSupported = ( eventName in div );
                        if ( !isSupported ) {
                                div.setAttribute( eventName, "return;" );
                                isSupported = ( typeof div[ eventName ] === "function" );
                        }
                        support[ i + "Bubbles" ] = isSupported;
                }
        }

        // Run tests that need a body at doc ready
        jQuery(function() {
                var container, div, tds, marginDiv,
                        divReset = "padding:0;margin:0;border:0;display:block;overflow:hidden;",
                        body = document.getElementsByTagName("body")[0];

                if ( !body ) {
                        // Return for frameset docs that don't have a body
                        return;
                }

                container = document.createElement("div");
                container.style.cssText = "visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px";
                body.insertBefore( container, body.firstChild );

                // Construct the test element
                div = document.createElement("div");
                container.appendChild( div );

                // Check if table cells still have offsetWidth/Height when they are set
                // to display:none and there are still other visible table cells in a
                // table row; if so, offsetWidth/Height are not reliable for use when
                // determining if an element has been hidden directly using
                // display:none (it is still safe to use offsets if a parent element is
                // hidden; don safety goggles and see bug #4512 for more information).
                // (only IE 8 fails this test)
                div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
                tds = div.getElementsByTagName("td");
                tds[ 0 ].style.cssText = "padding:0;margin:0;border:0;display:none";
                isSupported = ( tds[ 0 ].offsetHeight === 0 );

                tds[ 0 ].style.display = "";
                tds[ 1 ].style.display = "none";

                // Check if empty table cells still have offsetWidth/Height
                // (IE <= 8 fail this test)
                support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

                // Check box-sizing and margin behavior
                div.innerHTML = "";
                div.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;";
                support.boxSizing = ( div.offsetWidth === 4 );
                support.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== 1 );

                // NOTE: To any future maintainer, we've window.getComputedStyle
                // because jsdom on node.js will break without it.
                if ( window.getComputedStyle ) {
                        support.pixelPosition = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
                        support.boxSizingReliable = ( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

                        // Check if div with explicit width and no margin-right incorrectly
                        // gets computed margin-right based on width of container. For more
                        // info see bug #3333
                        // Fails in WebKit before Feb 2011 nightlies
                        // WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
                        marginDiv = document.createElement("div");
                        marginDiv.style.cssText = div.style.cssText = divReset;
                        marginDiv.style.marginRight = marginDiv.style.width = "0";
                        div.style.width = "1px";
                        div.appendChild( marginDiv );
                        support.reliableMarginRight =
                                !parseFloat( ( window.getComputedStyle( marginDiv, null ) || {} ).marginRight );
                }

                if ( typeof div.style.zoom !== "undefined" ) {
                        // Check if natively block-level elements act like inline-block
                        // elements when setting their display to 'inline' and giving
                        // them layout
                        // (IE < 8 does this)
                        div.innerHTML = "";
                        div.style.cssText = divReset + "width:1px;padding:1px;display:inline;zoom:1";
                        support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

                        // Check if elements with layout shrink-wrap their children
                        // (IE 6 does this)
                        div.style.display = "block";
                        div.style.overflow = "visible";
                        div.innerHTML = "<div></div>";
                        div.firstChild.style.width = "5px";
                        support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );

                        container.style.zoom = 1;
                }

                // Null elements to avoid leaks in IE
                body.removeChild( container );
                container = div = tds = marginDiv = null;
        });

        // Null elements to avoid leaks in IE
        fragment.removeChild( div );
        all = a = select = opt = input = fragment = div = null;

        return support;
})();
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
        rmultiDash = /([A-Z])/g;

jQuery.extend({
        cache: {},

        deletedIds: [],

        // Remove at next major release (1.9/2.0)
        uuid: 0,

        // Unique for each copy of jQuery on the page
        // Non-digits removed to match rinlinejQuery
        expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

        // The following elements throw uncatchable exceptions if you
        // attempt to add expando properties to them.
        noData: {
                "embed": true,
                // Ban all objects except for Flash (which handle expandos)
                "object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
                "applet": true
        },

        hasData: function( elem ) {
                elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
                return !!elem && !isEmptyDataObject( elem );
        },

        data: function( elem, name, data, pvt /* Internal Use Only */ ) {
                if ( !jQuery.acceptData( elem ) ) {
                        return;
                }

                var thisCache, ret,
                        internalKey = jQuery.expando,
                        getByName = typeof name === "string",

                        // We have to handle DOM nodes and JS objects differently because IE6-7
                        // can't GC object references properly across the DOM-JS boundary
                        isNode = elem.nodeType,

                        // Only DOM nodes need the global jQuery cache; JS object data is
                        // attached directly to the object so GC can occur automatically
                        cache = isNode ? jQuery.cache : elem,

                        // Only defining an ID for JS objects if its cache already exists allows
                        // the code to shortcut on the same path as a DOM node with no cache
                        id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

                // Avoid doing any more work than we need to when trying to get data on an
                // object that has no data at all
                if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && getByName && data === undefined ) {
                        return;
                }

                if ( !id ) {
                        // Only DOM nodes need a new unique ID for each element since their data
                        // ends up in the global cache
                        if ( isNode ) {
                                elem[ internalKey ] = id = jQuery.deletedIds.pop() || jQuery.guid++;
                        } else {
                                id = internalKey;
                        }
                }

                if ( !cache[ id ] ) {
                        cache[ id ] = {};

                        // Avoids exposing jQuery metadata on plain JS objects when the object
                        // is serialized using JSON.stringify
                        if ( !isNode ) {
                                cache[ id ].toJSON = jQuery.noop;
                        }
                }

                // An object can be passed to jQuery.data instead of a key/value pair; this gets
                // shallow copied over onto the existing cache
                if ( typeof name === "object" || typeof name === "function" ) {
                        if ( pvt ) {
                                cache[ id ] = jQuery.extend( cache[ id ], name );
                        } else {
                                cache[ id ].data = jQuery.extend( cache[ id ].data, name );
                        }
                }

                thisCache = cache[ id ];

                // jQuery data() is stored in a separate object inside the object's internal data
                // cache in order to avoid key collisions between internal data and user-defined
                // data.
                if ( !pvt ) {
                        if ( !thisCache.data ) {
                                thisCache.data = {};
                        }

                        thisCache = thisCache.data;
                }

                if ( data !== undefined ) {
                        thisCache[ jQuery.camelCase( name ) ] = data;
                }

                // Check for both converted-to-camel and non-converted data property names
                // If a data property was specified
                if ( getByName ) {

                        // First Try to find as-is property data
                        ret = thisCache[ name ];

                        // Test for null|undefined property data
                        if ( ret == null ) {

                                // Try to find the camelCased property
                                ret = thisCache[ jQuery.camelCase( name ) ];
                        }
                } else {
                        ret = thisCache;
                }

                return ret;
        },

        removeData: function( elem, name, pvt /* Internal Use Only */ ) {
                if ( !jQuery.acceptData( elem ) ) {
                        return;
                }

                var thisCache, i, l,

                        isNode = elem.nodeType,

                        // See jQuery.data for more information
                        cache = isNode ? jQuery.cache : elem,
                        id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

                // If there is already no cache entry for this object, there is no
                // purpose in continuing
                if ( !cache[ id ] ) {
                        return;
                }

                if ( name ) {

                        thisCache = pvt ? cache[ id ] : cache[ id ].data;

                        if ( thisCache ) {

                                // Support array or space separated string names for data keys
                                if ( !jQuery.isArray( name ) ) {

                                        // try the string as a key before any manipulation
                                        if ( name in thisCache ) {
                                                name = [ name ];
                                        } else {

                                                // split the camel cased version by spaces unless a key with the spaces exists
                                                name = jQuery.camelCase( name );
                                                if ( name in thisCache ) {
                                                        name = [ name ];
                                                } else {
                                                        name = name.split(" ");
                                                }
                                        }
                                }

                                for ( i = 0, l = name.length; i < l; i++ ) {
                                        delete thisCache[ name[i] ];
                                }

                                // If there is no data left in the cache, we want to continue
                                // and let the cache object itself get destroyed
                                if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
                                        return;
                                }
                        }
                }

                // See jQuery.data for more information
                if ( !pvt ) {
                        delete cache[ id ].data;

                        // Don't destroy the parent cache unless the internal data object
                        // had been the only thing left in it
                        if ( !isEmptyDataObject( cache[ id ] ) ) {
                                return;
                        }
                }

                // Destroy the cache
                if ( isNode ) {
                        jQuery.cleanData( [ elem ], true );

                // Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
                } else if ( jQuery.support.deleteExpando || cache != cache.window ) {
                        delete cache[ id ];

                // When all else fails, null
                } else {
                        cache[ id ] = null;
                }
        },

        // For internal use only.
        _data: function( elem, name, data ) {
                return jQuery.data( elem, name, data, true );
        },

        // A method for determining if a DOM node can handle the data expando
        acceptData: function( elem ) {
                var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

                // nodes accept data unless otherwise specified; rejection can be conditional
                return !noData || noData !== true && elem.getAttribute("classid") === noData;
        }
});

jQuery.fn.extend({
        data: function( key, value ) {
                var parts, part, attr, name, l,
                        elem = this[0],
                        i = 0,
                        data = null;

                // Gets all values
                if ( key === undefined ) {
                        if ( this.length ) {
                                data = jQuery.data( elem );

                                if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
                                        attr = elem.attributes;
                                        for ( l = attr.length; i < l; i++ ) {
                                                name = attr[i].name;

                                                if ( !name.indexOf( "data-" ) ) {
                                                        name = jQuery.camelCase( name.substring(5) );

                                                        dataAttr( elem, name, data[ name ] );
                                                }
                                        }
                                        jQuery._data( elem, "parsedAttrs", true );
                                }
                        }

                        return data;
                }

                // Sets multiple values
                if ( typeof key === "object" ) {
                        return this.each(function() {
                                jQuery.data( this, key );
                        });
                }

                parts = key.split( ".", 2 );
                parts[1] = parts[1] ? "." + parts[1] : "";
                part = parts[1] + "!";

                return jQuery.access( this, function( value ) {

                        if ( value === undefined ) {
                                data = this.triggerHandler( "getData" + part, [ parts[0] ] );

                                // Try to fetch any internally stored data first
                                if ( data === undefined && elem ) {
                                        data = jQuery.data( elem, key );
                                        data = dataAttr( elem, key, data );
                                }

                                return data === undefined && parts[1] ?
                                        this.data( parts[0] ) :
                                        data;
                        }

                        parts[1] = value;
                        this.each(function() {
                                var self = jQuery( this );

                                self.triggerHandler( "setData" + part, parts );
                                jQuery.data( this, key, value );
                                self.triggerHandler( "changeData" + part, parts );
                        });
                }, null, value, arguments.length > 1, null, false );
        },

        removeData: function( key ) {
                return this.each(function() {
                        jQuery.removeData( this, key );
                });
        }
});

function dataAttr( elem, key, data ) {
        // If nothing was found internally, try to fetch any
        // data from the HTML5 data-* attribute
        if ( data === undefined && elem.nodeType === 1 ) {

                var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

                data = elem.getAttribute( name );

                if ( typeof data === "string" ) {
                        try {
                                data = data === "true" ? true :
                                data === "false" ? false :
                                data === "null" ? null :
                                // Only convert to a number if it doesn't change the string
                                +data + "" === data ? +data :
                                rbrace.test( data ) ? jQuery.parseJSON( data ) :
                                        data;
                        } catch( e ) {}

                        // Make sure we set the data so it isn't changed later
                        jQuery.data( elem, key, data );

                } else {
                        data = undefined;
                }
        }

        return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
        var name;
        for ( name in obj ) {

                // if the public data object is empty, the private is still empty
                if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
                        continue;
                }
                if ( name !== "toJSON" ) {
                        return false;
                }
        }

        return true;
}
jQuery.extend({
        queue: function( elem, type, data ) {
                var queue;

                if ( elem ) {
                        type = ( type || "fx" ) + "queue";
                        queue = jQuery._data( elem, type );

                        // Speed up dequeue by getting out quickly if this is just a lookup
                        if ( data ) {
                                if ( !queue || jQuery.isArray(data) ) {
                                        queue = jQuery._data( elem, type, jQuery.makeArray(data) );
                                } else {
                                        queue.push( data );
                                }
                        }
                        return queue || [];
                }
        },

        dequeue: function( elem, type ) {
                type = type || "fx";

                var queue = jQuery.queue( elem, type ),
                        startLength = queue.length,
                        fn = queue.shift(),
                        hooks = jQuery._queueHooks( elem, type ),
                        next = function() {
                                jQuery.dequeue( elem, type );
                        };

                // If the fx queue is dequeued, always remove the progress sentinel
                if ( fn === "inprogress" ) {
                        fn = queue.shift();
                        startLength--;
                }

                if ( fn ) {

                        // Add a progress sentinel to prevent the fx queue from being
                        // automatically dequeued
                        if ( type === "fx" ) {
                                queue.unshift( "inprogress" );
                        }

                        // clear up the last queue stop function
                        delete hooks.stop;
                        fn.call( elem, next, hooks );
                }

                if ( !startLength && hooks ) {
                        hooks.empty.fire();
                }
        },

        // not intended for public consumption - generates a queueHooks object, or returns the current one
        _queueHooks: function( elem, type ) {
                var key = type + "queueHooks";
                return jQuery._data( elem, key ) || jQuery._data( elem, key, {
                        empty: jQuery.Callbacks("once memory").add(function() {
                                jQuery.removeData( elem, type + "queue", true );
                                jQuery.removeData( elem, key, true );
                        })
                });
        }
});

jQuery.fn.extend({
        queue: function( type, data ) {
                var setter = 2;

                if ( typeof type !== "string" ) {
                        data = type;
                        type = "fx";
                        setter--;
                }

                if ( arguments.length < setter ) {
                        return jQuery.queue( this[0], type );
                }

                return data === undefined ?
                        this :
                        this.each(function() {
                                var queue = jQuery.queue( this, type, data );

                                // ensure a hooks for this queue
                                jQuery._queueHooks( this, type );

                                if ( type === "fx" && queue[0] !== "inprogress" ) {
                                        jQuery.dequeue( this, type );
                                }
                        });
        },
        dequeue: function( type ) {
                return this.each(function() {
                        jQuery.dequeue( this, type );
                });
        },
        // Based off of the plugin by Clint Helfers, with permission.
        // http://blindsignals.com/index.php/2009/07/jquery-delay/
        delay: function( time, type ) {
                time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
                type = type || "fx";

                return this.queue( type, function( next, hooks ) {
                        var timeout = setTimeout( next, time );
                        hooks.stop = function() {
                                clearTimeout( timeout );
                        };
                });
        },
        clearQueue: function( type ) {
                return this.queue( type || "fx", [] );
        },
        // Get a promise resolved when queues of a certain type
        // are emptied (fx is the type by default)
        promise: function( type, obj ) {
                var tmp,
                        count = 1,
                        defer = jQuery.Deferred(),
                        elements = this,
                        i = this.length,
                        resolve = function() {
                                if ( !( --count ) ) {
                                        defer.resolveWith( elements, [ elements ] );
                                }
                        };

                if ( typeof type !== "string" ) {
                        obj = type;
                        type = undefined;
                }
                type = type || "fx";

                while( i-- ) {
                        tmp = jQuery._data( elements[ i ], type + "queueHooks" );
                        if ( tmp && tmp.empty ) {
                                count++;
                                tmp.empty.add( resolve );
                        }
                }
                resolve();
                return defer.promise( obj );
        }
});
var nodeHook, boolHook, fixSpecified,
        rclass = /[\t\r\n]/g,
        rreturn = /\r/g,
        rtype = /^(?:button|input)$/i,
        rfocusable = /^(?:button|input|object|select|textarea)$/i,
        rclickable = /^a(?:rea|)$/i,
        rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
        getSetAttribute = jQuery.support.getSetAttribute;

jQuery.fn.extend({
        attr: function( name, value ) {
                return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
        },

        removeAttr: function( name ) {
                return this.each(function() {
                        jQuery.removeAttr( this, name );
                });
        },

        prop: function( name, value ) {
                return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
        },

        removeProp: function( name ) {
                name = jQuery.propFix[ name ] || name;
                return this.each(function() {
                        // try/catch handles cases where IE balks (such as removing a property on window)
                        try {
                                this[ name ] = undefined;
                                delete this[ name ];
                        } catch( e ) {}
                });
        },

        addClass: function( value ) {
                var classNames, i, l, elem,
                        setClass, c, cl;

                if ( jQuery.isFunction( value ) ) {
                        return this.each(function( j ) {
                                jQuery( this ).addClass( value.call(this, j, this.className) );
                        });
                }

                if ( value && typeof value === "string" ) {
                        classNames = value.split( core_rspace );

                        for ( i = 0, l = this.length; i < l; i++ ) {
                                elem = this[ i ];

                                if ( elem.nodeType === 1 ) {
                                        if ( !elem.className && classNames.length === 1 ) {
                                                elem.className = value;

                                        } else {
                                                setClass = " " + elem.className + " ";

                                                for ( c = 0, cl = classNames.length; c < cl; c++ ) {
                                                        if ( setClass.indexOf( " " + classNames[ c ] + " " ) < 0 ) {
                                                                setClass += classNames[ c ] + " ";
                                                        }
                                                }
                                                elem.className = jQuery.trim( setClass );
                                        }
                                }
                        }
                }

                return this;
        },

        removeClass: function( value ) {
                var removes, className, elem, c, cl, i, l;

                if ( jQuery.isFunction( value ) ) {
                        return this.each(function( j ) {
                                jQuery( this ).removeClass( value.call(this, j, this.className) );
                        });
                }
                if ( (value && typeof value === "string") || value === undefined ) {
                        removes = ( value || "" ).split( core_rspace );

                        for ( i = 0, l = this.length; i < l; i++ ) {
                                elem = this[ i ];
                                if ( elem.nodeType === 1 && elem.className ) {

                                        className = (" " + elem.className + " ").replace( rclass, " " );

                                        // loop over each item in the removal list
                                        for ( c = 0, cl = removes.length; c < cl; c++ ) {
                                                // Remove until there is nothing to remove,
                                                while ( className.indexOf(" " + removes[ c ] + " ") >= 0 ) {
                                                        className = className.replace( " " + removes[ c ] + " " , " " );
                                                }
                                        }
                                        elem.className = value ? jQuery.trim( className ) : "";
                                }
                        }
                }

                return this;
        },

        toggleClass: function( value, stateVal ) {
                var type = typeof value,
                        isBool = typeof stateVal === "boolean";

                if ( jQuery.isFunction( value ) ) {
                        return this.each(function( i ) {
                                jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
                        });
                }

                return this.each(function() {
                        if ( type === "string" ) {
                                // toggle individual class names
                                var className,
                                        i = 0,
                                        self = jQuery( this ),
                                        state = stateVal,
                                        classNames = value.split( core_rspace );

                                while ( (className = classNames[ i++ ]) ) {
                                        // check each className given, space separated list
                                        state = isBool ? state : !self.hasClass( className );
                                        self[ state ? "addClass" : "removeClass" ]( className );
                                }

                        } else if ( type === "undefined" || type === "boolean" ) {
                                if ( this.className ) {
                                        // store className if set
                                        jQuery._data( this, "__className__", this.className );
                                }

                                // toggle whole className
                                this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
                        }
                });
        },

        hasClass: function( selector ) {
                var className = " " + selector + " ",
                        i = 0,
                        l = this.length;
                for ( ; i < l; i++ ) {
                        if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
                                return true;
                        }
                }

                return false;
        },

        val: function( value ) {
                var hooks, ret, isFunction,
                        elem = this[0];

                if ( !arguments.length ) {
                        if ( elem ) {
                                hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

                                if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
                                        return ret;
                                }

                                ret = elem.value;

                                return typeof ret === "string" ?
                                        // handle most common string cases
                                        ret.replace(rreturn, "") :
                                        // handle cases where value is null/undef or number
                                        ret == null ? "" : ret;
                        }

                        return;
                }

                isFunction = jQuery.isFunction( value );

                return this.each(function( i ) {
                        var val,
                                self = jQuery(this);

                        if ( this.nodeType !== 1 ) {
                                return;
                        }

                        if ( isFunction ) {
                                val = value.call( this, i, self.val() );
                        } else {
                                val = value;
                        }

                        // Treat null/undefined as ""; convert numbers to string
                        if ( val == null ) {
                                val = "";
                        } else if ( typeof val === "number" ) {
                                val += "";
                        } else if ( jQuery.isArray( val ) ) {
                                val = jQuery.map(val, function ( value ) {
                                        return value == null ? "" : value + "";
                                });
                        }

                        hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

                        // If set returns undefined, fall back to normal setting
                        if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
                                this.value = val;
                        }
                });
        }
});

jQuery.extend({
        valHooks: {
                option: {
                        get: function( elem ) {
                                // attributes.value is undefined in Blackberry 4.7 but
                                // uses .value. See #6932
                                var val = elem.attributes.value;
                                return !val || val.specified ? elem.value : elem.text;
                        }
                },
                select: {
                        get: function( elem ) {
                                var value, option,
                                        options = elem.options,
                                        index = elem.selectedIndex,
                                        one = elem.type === "select-one" || index < 0,
                                        values = one ? null : [],
                                        max = one ? index + 1 : options.length,
                                        i = index < 0 ?
                                                max :
                                                one ? index : 0;

                                // Loop through all the selected options
                                for ( ; i < max; i++ ) {
                                        option = options[ i ];

                                        // oldIE doesn't update selected after form reset (#2551)
                                        if ( ( option.selected || i === index ) &&
                                                        // Don't return options that are disabled or in a disabled optgroup
                                                        ( jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null ) &&
                                                        ( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

                                                // Get the specific value for the option
                                                value = jQuery( option ).val();

                                                // We don't need an array for one selects
                                                if ( one ) {
                                                        return value;
                                                }

                                                // Multi-Selects return an array
                                                values.push( value );
                                        }
                                }

                                return values;
                        },

                        set: function( elem, value ) {
                                var values = jQuery.makeArray( value );

                                jQuery(elem).find("option").each(function() {
                                        this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
                                });

                                if ( !values.length ) {
                                        elem.selectedIndex = -1;
                                }
                                return values;
                        }
                }
        },

        // Unused in 1.8, left in so attrFn-stabbers won't die; remove in 1.9
        attrFn: {},

        attr: function( elem, name, value, pass ) {
                var ret, hooks, notxml,
                        nType = elem.nodeType;

                // don't get/set attributes on text, comment and attribute nodes
                if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
                        return;
                }

                if ( pass && jQuery.isFunction( jQuery.fn[ name ] ) ) {
                        return jQuery( elem )[ name ]( value );
                }

                // Fallback to prop when attributes are not supported
                if ( typeof elem.getAttribute === "undefined" ) {
                        return jQuery.prop( elem, name, value );
                }

                notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

                // All attributes are lowercase
                // Grab necessary hook if one is defined
                if ( notxml ) {
                        name = name.toLowerCase();
                        hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
                }

                if ( value !== undefined ) {

                        if ( value === null ) {
                                jQuery.removeAttr( elem, name );
                                return;

                        } else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
                                return ret;

                        } else {
                                elem.setAttribute( name, value + "" );
                                return value;
                        }

                } else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
                        return ret;

                } else {

                        ret = elem.getAttribute( name );

                        // Non-existent attributes return null, we normalize to undefined
                        return ret === null ?
                                undefined :
                                ret;
                }
        },

        removeAttr: function( elem, value ) {
                var propName, attrNames, name, isBool,
                        i = 0;

                if ( value && elem.nodeType === 1 ) {

                        attrNames = value.split( core_rspace );

                        for ( ; i < attrNames.length; i++ ) {
                                name = attrNames[ i ];

                                if ( name ) {
                                        propName = jQuery.propFix[ name ] || name;
                                        isBool = rboolean.test( name );

                                        // See #9699 for explanation of this approach (setting first, then removal)
                                        // Do not do this for boolean attributes (see #10870)
                                        if ( !isBool ) {
                                                jQuery.attr( elem, name, "" );
                                        }
                                        elem.removeAttribute( getSetAttribute ? name : propName );

                                        // Set corresponding property to false for boolean attributes
                                        if ( isBool && propName in elem ) {
                                                elem[ propName ] = false;
                                        }
                                }
                        }
                }
        },

        attrHooks: {
                type: {
                        set: function( elem, value ) {
                                // We can't allow the type property to be changed (since it causes problems in IE)
                                if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
                                        jQuery.error( "type property can't be changed" );
                                } else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
                                        // Setting the type on a radio button after the value resets the value in IE6-9
                                        // Reset value to it's default in case type is set after value
                                        // This is for element creation
                                        var val = elem.value;
                                        elem.setAttribute( "type", value );
                                        if ( val ) {
                                                elem.value = val;
                                        }
                                        return value;
                                }
                        }
                },
                // Use the value property for back compat
                // Use the nodeHook for button elements in IE6/7 (#1954)
                value: {
                        get: function( elem, name ) {
                                if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
                                        return nodeHook.get( elem, name );
                                }
                                return name in elem ?
                                        elem.value :
                                        null;
                        },
                        set: function( elem, value, name ) {
                                if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
                                        return nodeHook.set( elem, value, name );
                                }
                                // Does not return so that setAttribute is also used
                                elem.value = value;
                        }
                }
        },

        propFix: {
                tabindex: "tabIndex",
                readonly: "readOnly",
                "for": "htmlFor",
                "class": "className",
                maxlength: "maxLength",
                cellspacing: "cellSpacing",
                cellpadding: "cellPadding",
                rowspan: "rowSpan",
                colspan: "colSpan",
                usemap: "useMap",
                frameborder: "frameBorder",
                contenteditable: "contentEditable"
        },

        prop: function( elem, name, value ) {
                var ret, hooks, notxml,
                        nType = elem.nodeType;

                // don't get/set properties on text, comment and attribute nodes
                if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
                        return;
                }

                notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

                if ( notxml ) {
                        // Fix name and attach hooks
                        name = jQuery.propFix[ name ] || name;
                        hooks = jQuery.propHooks[ name ];
                }

                if ( value !== undefined ) {
                        if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
                                return ret;

                        } else {
                                return ( elem[ name ] = value );
                        }

                } else {
                        if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
                                return ret;

                        } else {
                                return elem[ name ];
                        }
                }
        },

        propHooks: {
                tabIndex: {
                        get: function( elem ) {
                                // elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
                                // http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
                                var attributeNode = elem.getAttributeNode("tabindex");

                                return attributeNode && attributeNode.specified ?
                                        parseInt( attributeNode.value, 10 ) :
                                        rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
                                                0 :
                                                undefined;
                        }
                }
        }
});

// Hook for boolean attributes
boolHook = {
        get: function( elem, name ) {
                // Align boolean attributes with corresponding properties
                // Fall back to attribute presence where some booleans are not supported
                var attrNode,
                        property = jQuery.prop( elem, name );
                return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
                        name.toLowerCase() :
                        undefined;
        },
        set: function( elem, value, name ) {
                var propName;
                if ( value === false ) {
                        // Remove boolean attributes when set to false
                        jQuery.removeAttr( elem, name );
                } else {
                        // value is true since we know at this point it's type boolean and not false
                        // Set boolean attributes to the same name and set the DOM property
                        propName = jQuery.propFix[ name ] || name;
                        if ( propName in elem ) {
                                // Only set the IDL specifically if it already exists on the element
                                elem[ propName ] = true;
                        }

                        elem.setAttribute( name, name.toLowerCase() );
                }
                return name;
        }
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

        fixSpecified = {
                name: true,
                id: true,
                coords: true
        };

        // Use this for any attribute in IE6/7
        // This fixes almost every IE6/7 issue
        nodeHook = jQuery.valHooks.button = {
                get: function( elem, name ) {
                        var ret;
                        ret = elem.getAttributeNode( name );
                        return ret && ( fixSpecified[ name ] ? ret.value !== "" : ret.specified ) ?
                                ret.value :
                                undefined;
                },
                set: function( elem, value, name ) {
                        // Set the existing or create a new attribute node
                        var ret = elem.getAttributeNode( name );
                        if ( !ret ) {
                                ret = document.createAttribute( name );
                                elem.setAttributeNode( ret );
                        }
                        return ( ret.value = value + "" );
                }
        };

        // Set width and height to auto instead of 0 on empty string( Bug #8150 )
        // This is for removals
        jQuery.each([ "width", "height" ], function( i, name ) {
                jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
                        set: function( elem, value ) {
                                if ( value === "" ) {
                                        elem.setAttribute( name, "auto" );
                                        return value;
                                }
                        }
                });
        });

        // Set contenteditable to false on removals(#10429)
        // Setting to empty string throws an error as an invalid value
        jQuery.attrHooks.contenteditable = {
                get: nodeHook.get,
                set: function( elem, value, name ) {
                        if ( value === "" ) {
                                value = "false";
                        }
                        nodeHook.set( elem, value, name );
                }
        };
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
        jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
                jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
                        get: function( elem ) {
                                var ret = elem.getAttribute( name, 2 );
                                return ret === null ? undefined : ret;
                        }
                });
        });
}

if ( !jQuery.support.style ) {
        jQuery.attrHooks.style = {
                get: function( elem ) {
                        // Return undefined in the case of empty string
                        // Normalize to lowercase since IE uppercases css property names
                        return elem.style.cssText.toLowerCase() || undefined;
                },
                set: function( elem, value ) {
                        return ( elem.style.cssText = value + "" );
                }
        };
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
        jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
                get: function( elem ) {
                        var parent = elem.parentNode;

                        if ( parent ) {
                                parent.selectedIndex;

                                // Make sure that it also works with optgroups, see #5701
                                if ( parent.parentNode ) {
                                        parent.parentNode.selectedIndex;
                                }
                        }
                        return null;
                }
        });
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
        jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
        jQuery.each([ "radio", "checkbox" ], function() {
                jQuery.valHooks[ this ] = {
                        get: function( elem ) {
                                // Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
                                return elem.getAttribute("value") === null ? "on" : elem.value;
                        }
                };
        });
}
jQuery.each([ "radio", "checkbox" ], function() {
        jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
                set: function( elem, value ) {
                        if ( jQuery.isArray( value ) ) {
                                return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
                        }
                }
        });
});
var rformElems = /^(?:textarea|input|select)$/i,
        rtypenamespace = /^([^\.]*|)(?:\.(.+)|)$/,
        rhoverHack = /(?:^|\s)hover(\.\S+|)\b/,
        rkeyEvent = /^key/,
        rmouseEvent = /^(?:mouse|contextmenu)|click/,
        rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
        hoverHack = function( events ) {
                return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
        };

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

        add: function( elem, types, handler, data, selector ) {

                var elemData, eventHandle, events,
                        t, tns, type, namespaces, handleObj,
                        handleObjIn, handlers, special;

                // Don't attach events to noData or text/comment nodes (allow plain objects tho)
                if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
                        return;
                }

                // Caller can pass in an object of custom data in lieu of the handler
                if ( handler.handler ) {
                        handleObjIn = handler;
                        handler = handleObjIn.handler;
                        selector = handleObjIn.selector;
                }

                // Make sure that the handler has a unique ID, used to find/remove it later
                if ( !handler.guid ) {
                        handler.guid = jQuery.guid++;
                }

                // Init the element's event structure and main handler, if this is the first
                events = elemData.events;
                if ( !events ) {
                        elemData.events = events = {};
                }
                eventHandle = elemData.handle;
                if ( !eventHandle ) {
                        elemData.handle = eventHandle = function( e ) {
                                // Discard the second event of a jQuery.event.trigger() and
                                // when an event is called after a page has unloaded
                                return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
                                        jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
                                        undefined;
                        };
                        // Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
                        eventHandle.elem = elem;
                }

                // Handle multiple events separated by a space
                // jQuery(...).bind("mouseover mouseout", fn);
                types = jQuery.trim( hoverHack(types) ).split( " " );
                for ( t = 0; t < types.length; t++ ) {

                        tns = rtypenamespace.exec( types[t] ) || [];
                        type = tns[1];
                        namespaces = ( tns[2] || "" ).split( "." ).sort();

                        // If event changes its type, use the special event handlers for the changed type
                        special = jQuery.event.special[ type ] || {};

                        // If selector defined, determine special event api type, otherwise given type
                        type = ( selector ? special.delegateType : special.bindType ) || type;

                        // Update special based on newly reset type
                        special = jQuery.event.special[ type ] || {};

                        // handleObj is passed to all event handlers
                        handleObj = jQuery.extend({
                                type: type,
                                origType: tns[1],
                                data: data,
                                handler: handler,
                                guid: handler.guid,
                                selector: selector,
                                needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
                                namespace: namespaces.join(".")
                        }, handleObjIn );

                        // Init the event handler queue if we're the first
                        handlers = events[ type ];
                        if ( !handlers ) {
                                handlers = events[ type ] = [];
                                handlers.delegateCount = 0;

                                // Only use addEventListener/attachEvent if the special events handler returns false
                                if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
                                        // Bind the global event handler to the element
                                        if ( elem.addEventListener ) {
                                                elem.addEventListener( type, eventHandle, false );

                                        } else if ( elem.attachEvent ) {
                                                elem.attachEvent( "on" + type, eventHandle );
                                        }
                                }
                        }

                        if ( special.add ) {
                                special.add.call( elem, handleObj );

                                if ( !handleObj.handler.guid ) {
                                        handleObj.handler.guid = handler.guid;
                                }
                        }

                        // Add to the element's handler list, delegates in front
                        if ( selector ) {
                                handlers.splice( handlers.delegateCount++, 0, handleObj );
                        } else {
                                handlers.push( handleObj );
                        }

                        // Keep track of which events have ever been used, for event optimization
                        jQuery.event.global[ type ] = true;
                }

                // Nullify elem to prevent memory leaks in IE
                elem = null;
        },

        global: {},

        // Detach an event or set of events from an element
        remove: function( elem, types, handler, selector, mappedTypes ) {

                var t, tns, type, origType, namespaces, origCount,
                        j, events, special, eventType, handleObj,
                        elemData = jQuery.hasData( elem ) && jQuery._data( elem );

                if ( !elemData || !(events = elemData.events) ) {
                        return;
                }

                // Once for each type.namespace in types; type may be omitted
                types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
                for ( t = 0; t < types.length; t++ ) {
                        tns = rtypenamespace.exec( types[t] ) || [];
                        type = origType = tns[1];
                        namespaces = tns[2];

                        // Unbind all events (on this namespace, if provided) for the element
                        if ( !type ) {
                                for ( type in events ) {
                                        jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
                                }
                                continue;
                        }

                        special = jQuery.event.special[ type ] || {};
                        type = ( selector? special.delegateType : special.bindType ) || type;
                        eventType = events[ type ] || [];
                        origCount = eventType.length;
                        namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

                        // Remove matching events
                        for ( j = 0; j < eventType.length; j++ ) {
                                handleObj = eventType[ j ];

                                if ( ( mappedTypes || origType === handleObj.origType ) &&
                                         ( !handler || handler.guid === handleObj.guid ) &&
                                         ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
                                         ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
                                        eventType.splice( j--, 1 );

                                        if ( handleObj.selector ) {
                                                eventType.delegateCount--;
                                        }
                                        if ( special.remove ) {
                                                special.remove.call( elem, handleObj );
                                        }
                                }
                        }

                        // Remove generic event handler if we removed something and no more handlers exist
                        // (avoids potential for endless recursion during removal of special event handlers)
                        if ( eventType.length === 0 && origCount !== eventType.length ) {
                                if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
                                        jQuery.removeEvent( elem, type, elemData.handle );
                                }

                                delete events[ type ];
                        }
                }

                // Remove the expando if it's no longer used
                if ( jQuery.isEmptyObject( events ) ) {
                        delete elemData.handle;

                        // removeData also checks for emptiness and clears the expando if empty
                        // so use it instead of delete
                        jQuery.removeData( elem, "events", true );
                }
        },

        // Events that are safe to short-circuit if no handlers are attached.
        // Native DOM events should not be added, they may have inline handlers.
        customEvent: {
                "getData": true,
                "setData": true,
                "changeData": true
        },

        trigger: function( event, data, elem, onlyHandlers ) {
                // Don't do events on text and comment nodes
                if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
                        return;
                }

                // Event object or event type
                var cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType,
                        type = event.type || event,
                        namespaces = [];

                // focus/blur morphs to focusin/out; ensure we're not firing them right now
                if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
                        return;
                }

                if ( type.indexOf( "!" ) >= 0 ) {
                        // Exclusive events trigger only for the exact event (no namespaces)
                        type = type.slice(0, -1);
                        exclusive = true;
                }

                if ( type.indexOf( "." ) >= 0 ) {
                        // Namespaced trigger; create a regexp to match event type in handle()
                        namespaces = type.split(".");
                        type = namespaces.shift();
                        namespaces.sort();
                }

                if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
                        // No jQuery handlers for this event type, and it can't have inline handlers
                        return;
                }

                // Caller can pass in an Event, Object, or just an event type string
                event = typeof event === "object" ?
                        // jQuery.Event object
                        event[ jQuery.expando ] ? event :
                        // Object literal
                        new jQuery.Event( type, event ) :
                        // Just the event type (string)
                        new jQuery.Event( type );

                event.type = type;
                event.isTrigger = true;
                event.exclusive = exclusive;
                event.namespace = namespaces.join( "." );
                event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
                ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

                // Handle a global trigger
                if ( !elem ) {

                        // TODO: Stop taunting the data cache; remove global events and always attach to document
                        cache = jQuery.cache;
                        for ( i in cache ) {
                                if ( cache[ i ].events && cache[ i ].events[ type ] ) {
                                        jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
                                }
                        }
                        return;
                }

                // Clean up the event in case it is being reused
                event.result = undefined;
                if ( !event.target ) {
                        event.target = elem;
                }

                // Clone any incoming data and prepend the event, creating the handler arg list
                data = data != null ? jQuery.makeArray( data ) : [];
                data.unshift( event );

                // Allow special events to draw outside the lines
                special = jQuery.event.special[ type ] || {};
                if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
                        return;
                }

                // Determine event propagation path in advance, per W3C events spec (#9951)
                // Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
                eventPath = [[ elem, special.bindType || type ]];
                if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

                        bubbleType = special.delegateType || type;
                        cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
                        for ( old = elem; cur; cur = cur.parentNode ) {
                                eventPath.push([ cur, bubbleType ]);
                                old = cur;
                        }

                        // Only add window if we got to document (e.g., not plain obj or detached DOM)
                        if ( old === (elem.ownerDocument || document) ) {
                                eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
                        }
                }

                // Fire handlers on the event path
                for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

                        cur = eventPath[i][0];
                        event.type = eventPath[i][1];

                        handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
                        if ( handle ) {
                                handle.apply( cur, data );
                        }
                        // Note that this is a bare JS function and not a jQuery handler
                        handle = ontype && cur[ ontype ];
                        if ( handle && jQuery.acceptData( cur ) && handle.apply && handle.apply( cur, data ) === false ) {
                                event.preventDefault();
                        }
                }
                event.type = type;

                // If nobody prevented the default action, do it now
                if ( !onlyHandlers && !event.isDefaultPrevented() ) {

                        if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
                                !(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

                                // Call a native DOM method on the target with the same name name as the event.
                                // Can't use an .isFunction() check here because IE6/7 fails that test.
                                // Don't do default actions on window, that's where global variables be (#6170)
                                // IE<9 dies on focus/blur to hidden element (#1486)
                                if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

                                        // Don't re-trigger an onFOO event when we call its FOO() method
                                        old = elem[ ontype ];

                                        if ( old ) {
                                                elem[ ontype ] = null;
                                        }

                                        // Prevent re-triggering of the same event, since we already bubbled it above
                                        jQuery.event.triggered = type;
                                        elem[ type ]();
                                        jQuery.event.triggered = undefined;

                                        if ( old ) {
                                                elem[ ontype ] = old;
                                        }
                                }
                        }
                }

                return event.result;
        },

        dispatch: function( event ) {

                // Make a writable jQuery.Event from the native event object
                event = jQuery.event.fix( event || window.event );

                var i, j, cur, ret, selMatch, matched, matches, handleObj, sel, related,
                        handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
                        delegateCount = handlers.delegateCount,
                        args = core_slice.call( arguments ),
                        run_all = !event.exclusive && !event.namespace,
                        special = jQuery.event.special[ event.type ] || {},
                        handlerQueue = [];

                // Use the fix-ed jQuery.Event rather than the (read-only) native event
                args[0] = event;
                event.delegateTarget = this;

                // Call the preDispatch hook for the mapped type, and let it bail if desired
                if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
                        return;
                }

                // Determine handlers that should run if there are delegated events
                // Avoid non-left-click bubbling in Firefox (#3861)
                if ( delegateCount && !(event.button && event.type === "click") ) {

                        for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

                                // Don't process clicks (ONLY) on disabled elements (#6911, #8165, #11382, #11764)
                                if ( cur.disabled !== true || event.type !== "click" ) {
                                        selMatch = {};
                                        matches = [];
                                        for ( i = 0; i < delegateCount; i++ ) {
                                                handleObj = handlers[ i ];
                                                sel = handleObj.selector;

                                                if ( selMatch[ sel ] === undefined ) {
                                                        selMatch[ sel ] = handleObj.needsContext ?
                                                                jQuery( sel, this ).index( cur ) >= 0 :
                                                                jQuery.find( sel, this, null, [ cur ] ).length;
                                                }
                                                if ( selMatch[ sel ] ) {
                                                        matches.push( handleObj );
                                                }
                                        }
                                        if ( matches.length ) {
                                                handlerQueue.push({ elem: cur, matches: matches });
                                        }
                                }
                        }
                }

                // Add the remaining (directly-bound) handlers
                if ( handlers.length > delegateCount ) {
                        handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
                }

                // Run delegates first; they may want to stop propagation beneath us
                for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
                        matched = handlerQueue[ i ];
                        event.currentTarget = matched.elem;

                        for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
                                handleObj = matched.matches[ j ];

                                // Triggered event must either 1) be non-exclusive and have no namespace, or
                                // 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
                                if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

                                        event.data = handleObj.data;
                                        event.handleObj = handleObj;

                                        ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
                                                        .apply( matched.elem, args );

                                        if ( ret !== undefined ) {
                                                event.result = ret;
                                                if ( ret === false ) {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                }
                                        }
                                }
                        }
                }

                // Call the postDispatch hook for the mapped type
                if ( special.postDispatch ) {
                        special.postDispatch.call( this, event );
                }

                return event.result;
        },

        // Includes some event props shared by KeyEvent and MouseEvent
        // *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
        props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

        fixHooks: {},

        keyHooks: {
                props: "char charCode key keyCode".split(" "),
                filter: function( event, original ) {

                        // Add which for key events
                        if ( event.which == null ) {
                                event.which = original.charCode != null ? original.charCode : original.keyCode;
                        }

                        return event;
                }
        },

        mouseHooks: {
                props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
                filter: function( event, original ) {
                        var eventDoc, doc, body,
                                button = original.button,
                                fromElement = original.fromElement;

                        // Calculate pageX/Y if missing and clientX/Y available
                        if ( event.pageX == null && original.clientX != null ) {
                                eventDoc = event.target.ownerDocument || document;
                                doc = eventDoc.documentElement;
                                body = eventDoc.body;

                                event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
                                event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
                        }

                        // Add relatedTarget, if necessary
                        if ( !event.relatedTarget && fromElement ) {
                                event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
                        }

                        // Add which for click: 1 === left; 2 === middle; 3 === right
                        // Note: button is not normalized, so don't use it
                        if ( !event.which && button !== undefined ) {
                                event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
                        }

                        return event;
                }
        },

        fix: function( event ) {
                if ( event[ jQuery.expando ] ) {
                        return event;
                }

                // Create a writable copy of the event object and normalize some properties
                var i, prop,
                        originalEvent = event,
                        fixHook = jQuery.event.fixHooks[ event.type ] || {},
                        copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

                event = jQuery.Event( originalEvent );

                for ( i = copy.length; i; ) {
                        prop = copy[ --i ];
                        event[ prop ] = originalEvent[ prop ];
                }

                // Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
                if ( !event.target ) {
                        event.target = originalEvent.srcElement || document;
                }

                // Target should not be a text node (#504, Safari)
                if ( event.target.nodeType === 3 ) {
                        event.target = event.target.parentNode;
                }

                // For mouse/key events, metaKey==false if it's undefined (#3368, #11328; IE6/7/8)
                event.metaKey = !!event.metaKey;

                return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
        },

        special: {
                load: {
                        // Prevent triggered image.load events from bubbling to window.load
                        noBubble: true
                },

                focus: {
                        delegateType: "focusin"
                },
                blur: {
                        delegateType: "focusout"
                },

                beforeunload: {
                        setup: function( data, namespaces, eventHandle ) {
                                // We only want to do this special case on windows
                                if ( jQuery.isWindow( this ) ) {
                                        this.onbeforeunload = eventHandle;
                                }
                        },

                        teardown: function( namespaces, eventHandle ) {
                                if ( this.onbeforeunload === eventHandle ) {
                                        this.onbeforeunload = null;
                                }
                        }
                }
        },

        simulate: function( type, elem, event, bubble ) {
                // Piggyback on a donor event to simulate a different one.
                // Fake originalEvent to avoid donor's stopPropagation, but if the
                // simulated event prevents default then we do the same on the donor.
                var e = jQuery.extend(
                        new jQuery.Event(),
                        event,
                        { type: type,
                                isSimulated: true,
                                originalEvent: {}
                        }
                );
                if ( bubble ) {
                        jQuery.event.trigger( e, null, elem );
                } else {
                        jQuery.event.dispatch.call( elem, e );
                }
                if ( e.isDefaultPrevented() ) {
                        event.preventDefault();
                }
        }
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
        function( elem, type, handle ) {
                if ( elem.removeEventListener ) {
                        elem.removeEventListener( type, handle, false );
                }
        } :
        function( elem, type, handle ) {
                var name = "on" + type;

                if ( elem.detachEvent ) {

                        // #8545, #7054, preventing memory leaks for custom events in IE6-8
                        // detachEvent needed property on element, by name of that event, to properly expose it to GC
                        if ( typeof elem[ name ] === "undefined" ) {
                                elem[ name ] = null;
                        }

                        elem.detachEvent( name, handle );
                }
        };

jQuery.Event = function( src, props ) {
        // Allow instantiation without the 'new' keyword
        if ( !(this instanceof jQuery.Event) ) {
                return new jQuery.Event( src, props );
        }

        // Event object
        if ( src && src.type ) {
                this.originalEvent = src;
                this.type = src.type;

                // Events bubbling up the document may have been marked as prevented
                // by a handler lower down the tree; reflect the correct value.
                this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
                        src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

        // Event type
        } else {
                this.type = src;
        }

        // Put explicitly provided properties onto the event object
        if ( props ) {
                jQuery.extend( this, props );
        }

        // Create a timestamp if incoming event doesn't have one
        this.timeStamp = src && src.timeStamp || jQuery.now();

        // Mark it as fixed
        this[ jQuery.expando ] = true;
};

function returnFalse() {
        return false;
}
function returnTrue() {
        return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
        preventDefault: function() {
                this.isDefaultPrevented = returnTrue;

                var e = this.originalEvent;
                if ( !e ) {
                        return;
                }

                // if preventDefault exists run it on the original event
                if ( e.preventDefault ) {
                        e.preventDefault();

                // otherwise set the returnValue property of the original event to false (IE)
                } else {
                        e.returnValue = false;
                }
        },
        stopPropagation: function() {
                this.isPropagationStopped = returnTrue;

                var e = this.originalEvent;
                if ( !e ) {
                        return;
                }
                // if stopPropagation exists run it on the original event
                if ( e.stopPropagation ) {
                        e.stopPropagation();
                }
                // otherwise set the cancelBubble property of the original event to true (IE)
                e.cancelBubble = true;
        },
        stopImmediatePropagation: function() {
                this.isImmediatePropagationStopped = returnTrue;
                this.stopPropagation();
        },
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
}, function( orig, fix ) {
        jQuery.event.special[ orig ] = {
                delegateType: fix,
                bindType: fix,

                handle: function( event ) {
                        var ret,
                                target = this,
                                related = event.relatedTarget,
                                handleObj = event.handleObj,
                                selector = handleObj.selector;

                        // For mousenter/leave call the handler if related is outside the target.
                        // NB: No relatedTarget if the mouse left/entered the browser window
                        if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
                                event.type = handleObj.origType;
                                ret = handleObj.handler.apply( this, arguments );
                                event.type = fix;
                        }
                        return ret;
                }
        };
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

        jQuery.event.special.submit = {
                setup: function() {
                        // Only need this for delegated form submit events
                        if ( jQuery.nodeName( this, "form" ) ) {
                                return false;
                        }

                        // Lazy-add a submit handler when a descendant form may potentially be submitted
                        jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
                                // Node name check avoids a VML-related crash in IE (#9807)
                                var elem = e.target,
                                        form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
                                if ( form && !jQuery._data( form, "_submit_attached" ) ) {
                                        jQuery.event.add( form, "submit._submit", function( event ) {
                                                event._submit_bubble = true;
                                        });
                                        jQuery._data( form, "_submit_attached", true );
                                }
                        });
                        // return undefined since we don't need an event listener
                },

                postDispatch: function( event ) {
                        // If form was submitted by the user, bubble the event up the tree
                        if ( event._submit_bubble ) {
                                delete event._submit_bubble;
                                if ( this.parentNode && !event.isTrigger ) {
                                        jQuery.event.simulate( "submit", this.parentNode, event, true );
                                }
                        }
                },

                teardown: function() {
                        // Only need this for delegated form submit events
                        if ( jQuery.nodeName( this, "form" ) ) {
                                return false;
                        }

                        // Remove delegated handlers; cleanData eventually reaps submit handlers attached above
                        jQuery.event.remove( this, "._submit" );
                }
        };
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

        jQuery.event.special.change = {

                setup: function() {

                        if ( rformElems.test( this.nodeName ) ) {
                                // IE doesn't fire change on a check/radio until blur; trigger it on click
                                // after a propertychange. Eat the blur-change in special.change.handle.
                                // This still fires onchange a second time for check/radio after blur.
                                if ( this.type === "checkbox" || this.type === "radio" ) {
                                        jQuery.event.add( this, "propertychange._change", function( event ) {
                                                if ( event.originalEvent.propertyName === "checked" ) {
                                                        this._just_changed = true;
                                                }
                                        });
                                        jQuery.event.add( this, "click._change", function( event ) {
                                                if ( this._just_changed && !event.isTrigger ) {
                                                        this._just_changed = false;
                                                }
                                                // Allow triggered, simulated change events (#11500)
                                                jQuery.event.simulate( "change", this, event, true );
                                        });
                                }
                                return false;
                        }
                        // Delegated event; lazy-add a change handler on descendant inputs
                        jQuery.event.add( this, "beforeactivate._change", function( e ) {
                                var elem = e.target;

                                if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "_change_attached" ) ) {
                                        jQuery.event.add( elem, "change._change", function( event ) {
                                                if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
                                                        jQuery.event.simulate( "change", this.parentNode, event, true );
                                                }
                                        });
                                        jQuery._data( elem, "_change_attached", true );
                                }
                        });
                },

                handle: function( event ) {
                        var elem = event.target;

                        // Swallow native change events from checkbox/radio, we already triggered them above
                        if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
                                return event.handleObj.handler.apply( this, arguments );
                        }
                },

                teardown: function() {
                        jQuery.event.remove( this, "._change" );

                        return !rformElems.test( this.nodeName );
                }
        };
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
        jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

                // Attach a single capturing handler while someone wants focusin/focusout
                var attaches = 0,
                        handler = function( event ) {
                                jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
                        };

                jQuery.event.special[ fix ] = {
                        setup: function() {
                                if ( attaches++ === 0 ) {
                                        document.addEventListener( orig, handler, true );
                                }
                        },
                        teardown: function() {
                                if ( --attaches === 0 ) {
                                        document.removeEventListener( orig, handler, true );
                                }
                        }
                };
        });
}

jQuery.fn.extend({

        on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
                var origFn, type;

                // Types can be a map of types/handlers
                if ( typeof types === "object" ) {
                        // ( types-Object, selector, data )
                        if ( typeof selector !== "string" ) { // && selector != null
                                // ( types-Object, data )
                                data = data || selector;
                                selector = undefined;
                        }
                        for ( type in types ) {
                                this.on( type, selector, data, types[ type ], one );
                        }
                        return this;
                }

                if ( data == null && fn == null ) {
                        // ( types, fn )
                        fn = selector;
                        data = selector = undefined;
                } else if ( fn == null ) {
                        if ( typeof selector === "string" ) {
                                // ( types, selector, fn )
                                fn = data;
                                data = undefined;
                        } else {
                                // ( types, data, fn )
                                fn = data;
                                data = selector;
                                selector = undefined;
                        }
                }
                if ( fn === false ) {
                        fn = returnFalse;
                } else if ( !fn ) {
                        return this;
                }

                if ( one === 1 ) {
                        origFn = fn;
                        fn = function( event ) {
                                // Can use an empty set, since event contains the info
                                jQuery().off( event );
                                return origFn.apply( this, arguments );
                        };
                        // Use same guid so caller can remove using origFn
                        fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
                }
                return this.each( function() {
                        jQuery.event.add( this, types, fn, data, selector );
                });
        },
        one: function( types, selector, data, fn ) {
                return this.on( types, selector, data, fn, 1 );
        },
        off: function( types, selector, fn ) {
                var handleObj, type;
                if ( types && types.preventDefault && types.handleObj ) {
                        // ( event )  dispatched jQuery.Event
                        handleObj = types.handleObj;
                        jQuery( types.delegateTarget ).off(
                                handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
                                handleObj.selector,
                                handleObj.handler
                        );
                        return this;
                }
                if ( typeof types === "object" ) {
                        // ( types-object [, selector] )
                        for ( type in types ) {
                                this.off( type, selector, types[ type ] );
                        }
                        return this;
                }
                if ( selector === false || typeof selector === "function" ) {
                        // ( types [, fn] )
                        fn = selector;
                        selector = undefined;
                }
                if ( fn === false ) {
                        fn = returnFalse;
                }
                return this.each(function() {
                        jQuery.event.remove( this, types, fn, selector );
                });
        },

        bind: function( types, data, fn ) {
                return this.on( types, null, data, fn );
        },
        unbind: function( types, fn ) {
                return this.off( types, null, fn );
        },

        live: function( types, data, fn ) {
                jQuery( this.context ).on( types, this.selector, data, fn );
                return this;
        },
        die: function( types, fn ) {
                jQuery( this.context ).off( types, this.selector || "**", fn );
                return this;
        },

        delegate: function( selector, types, data, fn ) {
                return this.on( types, selector, data, fn );
        },
        undelegate: function( selector, types, fn ) {
                // ( namespace ) or ( selector, types [, fn] )
                return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
        },

        trigger: function( type, data ) {
                return this.each(function() {
                        jQuery.event.trigger( type, data, this );
                });
        },
        triggerHandler: function( type, data ) {
                if ( this[0] ) {
                        return jQuery.event.trigger( type, data, this[0], true );
                }
        },

        toggle: function( fn ) {
                // Save reference to arguments for access in closure
                var args = arguments,
                        guid = fn.guid || jQuery.guid++,
                        i = 0,
                        toggler = function( event ) {
                                // Figure out which function to execute
                                var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
                                jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

                                // Make sure that clicks stop
                                event.preventDefault();

                                // and execute the function
                                return args[ lastToggle ].apply( this, arguments ) || false;
                        };

                // link all the functions, so any of them can unbind this click handler
                toggler.guid = guid;
                while ( i < args.length ) {
                        args[ i++ ].guid = guid;
                }

                return this.click( toggler );
        },

        hover: function( fnOver, fnOut ) {
                return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
        }
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
        "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
        "change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

        // Handle event binding
        jQuery.fn[ name ] = function( data, fn ) {
                if ( fn == null ) {
                        fn = data;
                        data = null;
                }

                return arguments.length > 0 ?
                        this.on( name, null, data, fn ) :
                        this.trigger( name );
        };

        if ( rkeyEvent.test( name ) ) {
                jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
        }

        if ( rmouseEvent.test( name ) ) {
                jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
        }
});
/*!
 * Sizzle CSS Selector Engine
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://sizzlejs.com/
 */
(function( window, undefined ) {

var cachedruns,
        assertGetIdNotName,
        Expr,
        getText,
        isXML,
        contains,
        compile,
        sortOrder,
        hasDuplicate,
        outermostContext,

        baseHasDuplicate = true,
        strundefined = "undefined",

        expando = ( "sizcache" + Math.random() ).replace( ".", "" ),

        Token = String,
        document = window.document,
        docElem = document.documentElement,
        dirruns = 0,
        done = 0,
        pop = [].pop,
        push = [].push,
        slice = [].slice,
        // Use a stripped-down indexOf if a native one is unavailable
        indexOf = [].indexOf || function( elem ) {
                var i = 0,
                        len = this.length;
                for ( ; i < len; i++ ) {
                        if ( this[i] === elem ) {
                                return i;
                        }
                }
                return -1;
        },

        // Augment a function for special use by Sizzle
        markFunction = function( fn, value ) {
                fn[ expando ] = value == null || value;
                return fn;
        },

        createCache = function() {
                var cache = {},
                        keys = [];

                return markFunction(function( key, value ) {
                        // Only keep the most recent entries
                        if ( keys.push( key ) > Expr.cacheLength ) {
                                delete cache[ keys.shift() ];
                        }

                        // Retrieve with (key + " ") to avoid collision with native Object.prototype properties (see Issue #157)
                        return (cache[ key + " " ] = value);
                }, cache );
        },

        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),

        // Regex

        // Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
        whitespace = "[\\x20\\t\\r\\n\\f]",
        // http://www.w3.org/TR/css3-syntax/#characters
        characterEncoding = "(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",

        // Loosely modeled on CSS identifier characters
        // An unquoted value should be a CSS identifier (http://www.w3.org/TR/css3-selectors/#attribute-selectors)
        // Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
        identifier = characterEncoding.replace( "w", "w#" ),

        // Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
        operators = "([*^$|!~]?=)",
        attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
                "*(?:" + operators + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

        // Prefer arguments not in parens/brackets,
        //   then attribute selectors and non-pseudos (denoted by :),
        //   then anything else
        // These preferences are here to reduce the number of selectors
        //   needing tokenize in the PSEUDO preFilter
        pseudos = ":(" + characterEncoding + ")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:" + attributes + ")|[^:]|\\\\.)*|.*))\\)|)",

        // For matchExpr.POS and matchExpr.needsContext
        pos = ":(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
                "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)",

        // Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
        rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

        rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
        rcombinators = new RegExp( "^" + whitespace + "*([\\x20\\t\\r\\n\\f>+~])" + whitespace + "*" ),
        rpseudo = new RegExp( pseudos ),

        // Easily-parseable/retrievable ID or TAG or CLASS selectors
        rquickExpr = /^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,

        rnot = /^:not/,
        rsibling = /[\x20\t\r\n\f]*[+~]/,
        rendsWithNot = /:not\($/,

        rheader = /h\d/i,
        rinputs = /input|select|textarea|button/i,

        rbackslash = /\\(?!\\)/g,

        matchExpr = {
                "ID": new RegExp( "^#(" + characterEncoding + ")" ),
                "CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
                "NAME": new RegExp( "^\\[name=['\"]?(" + characterEncoding + ")['\"]?\\]" ),
                "TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
                "ATTR": new RegExp( "^" + attributes ),
                "PSEUDO": new RegExp( "^" + pseudos ),
                "POS": new RegExp( pos, "i" ),
                "CHILD": new RegExp( "^:(only|nth|first|last)-child(?:\\(" + whitespace +
                        "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
                        "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
                // For use in libraries implementing .is()
                "needsContext": new RegExp( "^" + whitespace + "*[>+~]|" + pos, "i" )
        },

        // Support

        // Used for testing something on an element
        assert = function( fn ) {
                var div = document.createElement("div");

                try {
                        return fn( div );
                } catch (e) {
                        return false;
                } finally {
                        // release memory in IE
                        div = null;
                }
        },

        // Check if getElementsByTagName("*") returns only elements
        assertTagNameNoComments = assert(function( div ) {
                div.appendChild( document.createComment("") );
                return !div.getElementsByTagName("*").length;
        }),

        // Check if getAttribute returns normalized href attributes
        assertHrefNotNormalized = assert(function( div ) {
                div.innerHTML = "<a href='#'></a>";
                return div.firstChild && typeof div.firstChild.getAttribute !== strundefined &&
                        div.firstChild.getAttribute("href") === "#";
        }),

        // Check if attributes should be retrieved by attribute nodes
        assertAttributes = assert(function( div ) {
                div.innerHTML = "<select></select>";
                var type = typeof div.lastChild.getAttribute("multiple");
                // IE8 returns a string for some attributes even when not present
                return type !== "boolean" && type !== "string";
        }),

        // Check if getElementsByClassName can be trusted
        assertUsableClassName = assert(function( div ) {
                // Opera can't find a second classname (in 9.6)
                div.innerHTML = "<div class='hidden e'></div><div class='hidden'></div>";
                if ( !div.getElementsByClassName || !div.getElementsByClassName("e").length ) {
                        return false;
                }

                // Safari 3.2 caches class attributes and doesn't catch changes
                div.lastChild.className = "e";
                return div.getElementsByClassName("e").length === 2;
        }),

        // Check if getElementById returns elements by name
        // Check if getElementsByName privileges form controls or returns elements by ID
        assertUsableName = assert(function( div ) {
                // Inject content
                div.id = expando + 0;
                div.innerHTML = "<a name='" + expando + "'></a><div name='" + expando + "'></div>";
                docElem.insertBefore( div, docElem.firstChild );

                // Test
                var pass = document.getElementsByName &&
                        // buggy browsers will return fewer than the correct 2
                        document.getElementsByName( expando ).length === 2 +
                        // buggy browsers will return more than the correct 0
                        document.getElementsByName( expando + 0 ).length;
                assertGetIdNotName = !document.getElementById( expando );

                // Cleanup
                docElem.removeChild( div );

                return pass;
        });

// If slice is not available, provide a backup
try {
        slice.call( docElem.childNodes, 0 )[0].nodeType;
} catch ( e ) {
        slice = function( i ) {
                var elem,
                        results = [];
                for ( ; (elem = this[i]); i++ ) {
                        results.push( elem );
                }
                return results;
        };
}

function Sizzle( selector, context, results, seed ) {
        results = results || [];
        context = context || document;
        var match, elem, xml, m,
                nodeType = context.nodeType;

        if ( !selector || typeof selector !== "string" ) {
                return results;
        }

        if ( nodeType !== 1 && nodeType !== 9 ) {
                return [];
        }

        xml = isXML( context );

        if ( !xml && !seed ) {
                if ( (match = rquickExpr.exec( selector )) ) {
                        // Speed-up: Sizzle("#ID")
                        if ( (m = match[1]) ) {
                                if ( nodeType === 9 ) {
                                        elem = context.getElementById( m );
                                        // Check parentNode to catch when Blackberry 4.6 returns
                                        // nodes that are no longer in the document #6963
                                        if ( elem && elem.parentNode ) {
                                                // Handle the case where IE, Opera, and Webkit return items
                                                // by name instead of ID
                                                if ( elem.id === m ) {
                                                        results.push( elem );
                                                        return results;
                                                }
                                        } else {
                                                return results;
                                        }
                                } else {
                                        // Context is not a document
                                        if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
                                                contains( context, elem ) && elem.id === m ) {
                                                results.push( elem );
                                                return results;
                                        }
                                }

                        // Speed-up: Sizzle("TAG")
                        } else if ( match[2] ) {
                                push.apply( results, slice.call(context.getElementsByTagName( selector ), 0) );
                                return results;

                        // Speed-up: Sizzle(".CLASS")
                        } else if ( (m = match[3]) && assertUsableClassName && context.getElementsByClassName ) {
                                push.apply( results, slice.call(context.getElementsByClassName( m ), 0) );
                                return results;
                        }
                }
        }

        // All others
        return select( selector.replace( rtrim, "$1" ), context, results, seed, xml );
}

Sizzle.matches = function( expr, elements ) {
        return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
        return Sizzle( expr, null, null, [ elem ] ).length > 0;
};

// Returns a function to use in pseudos for input types
function createInputPseudo( type ) {
        return function( elem ) {
                var name = elem.nodeName.toLowerCase();
                return name === "input" && elem.type === type;
        };
}

// Returns a function to use in pseudos for buttons
function createButtonPseudo( type ) {
        return function( elem ) {
                var name = elem.nodeName.toLowerCase();
                return (name === "input" || name === "button") && elem.type === type;
        };
}

// Returns a function to use in pseudos for positionals
function createPositionalPseudo( fn ) {
        return markFunction(function( argument ) {
                argument = +argument;
                return markFunction(function( seed, matches ) {
                        var j,
                                matchIndexes = fn( [], seed.length, argument ),
                                i = matchIndexes.length;

                        // Match elements found at the specified indexes
                        while ( i-- ) {
                                if ( seed[ (j = matchIndexes[i]) ] ) {
                                        seed[j] = !(matches[j] = seed[j]);
                                }
                        }
                });
        });
}

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
        var node,
                ret = "",
                i = 0,
                nodeType = elem.nodeType;

        if ( nodeType ) {
                if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
                        // Use textContent for elements
                        // innerText usage removed for consistency of new lines (see #11153)
                        if ( typeof elem.textContent === "string" ) {
                                return elem.textContent;
                        } else {
                                // Traverse its children
                                for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
                                        ret += getText( elem );
                                }
                        }
                } else if ( nodeType === 3 || nodeType === 4 ) {
                        return elem.nodeValue;
                }
                // Do not include comment or processing instruction nodes
        } else {

                // If no nodeType, this is expected to be an array
                for ( ; (node = elem[i]); i++ ) {
                        // Do not traverse comment nodes
                        ret += getText( node );
                }
        }
        return ret;
};

isXML = Sizzle.isXML = function( elem ) {
        // documentElement is verified for cases where it doesn't yet exist
        // (such as loading iframes in IE - #4833)
        var documentElement = elem && (elem.ownerDocument || elem).documentElement;
        return documentElement ? documentElement.nodeName !== "HTML" : false;
};

// Element contains another
contains = Sizzle.contains = docElem.contains ?
        function( a, b ) {
                var adown = a.nodeType === 9 ? a.documentElement : a,
                        bup = b && b.parentNode;
                return a === bup || !!( bup && bup.nodeType === 1 && adown.contains && adown.contains(bup) );
        } :
        docElem.compareDocumentPosition ?
        function( a, b ) {
                return b && !!( a.compareDocumentPosition( b ) & 16 );
        } :
        function( a, b ) {
                while ( (b = b.parentNode) ) {
                        if ( b === a ) {
                                return true;
                        }
                }
                return false;
        };

Sizzle.attr = function( elem, name ) {
        var val,
                xml = isXML( elem );

        if ( !xml ) {
                name = name.toLowerCase();
        }
        if ( (val = Expr.attrHandle[ name ]) ) {
                return val( elem );
        }
        if ( xml || assertAttributes ) {
                return elem.getAttribute( name );
        }
        val = elem.getAttributeNode( name );
        return val ?
                typeof elem[ name ] === "boolean" ?
                        elem[ name ] ? name : null :
                        val.specified ? val.value : null :
                null;
};

Expr = Sizzle.selectors = {

        // Can be adjusted by the user
        cacheLength: 50,

        createPseudo: markFunction,

        match: matchExpr,

        // IE6/7 return a modified href
        attrHandle: assertHrefNotNormalized ?
                {} :
                {
                        "href": function( elem ) {
                                return elem.getAttribute( "href", 2 );
                        },
                        "type": function( elem ) {
                                return elem.getAttribute("type");
                        }
                },

        find: {
                "ID": assertGetIdNotName ?
                        function( id, context, xml ) {
                                if ( typeof context.getElementById !== strundefined && !xml ) {
                                        var m = context.getElementById( id );
                                        // Check parentNode to catch when Blackberry 4.6 returns
                                        // nodes that are no longer in the document #6963
                                        return m && m.parentNode ? [m] : [];
                                }
                        } :
                        function( id, context, xml ) {
                                if ( typeof context.getElementById !== strundefined && !xml ) {
                                        var m = context.getElementById( id );

                                        return m ?
                                                m.id === id || typeof m.getAttributeNode !== strundefined && m.getAttributeNode("id").value === id ?
                                                        [m] :
                                                        undefined :
                                                [];
                                }
                        },

                "TAG": assertTagNameNoComments ?
                        function( tag, context ) {
                                if ( typeof context.getElementsByTagName !== strundefined ) {
                                        return context.getElementsByTagName( tag );
                                }
                        } :
                        function( tag, context ) {
                                var results = context.getElementsByTagName( tag );

                                // Filter out possible comments
                                if ( tag === "*" ) {
                                        var elem,
                                                tmp = [],
                                                i = 0;

                                        for ( ; (elem = results[i]); i++ ) {
                                                if ( elem.nodeType === 1 ) {
                                                        tmp.push( elem );
                                                }
                                        }

                                        return tmp;
                                }
                                return results;
                        },

                "NAME": assertUsableName && function( tag, context ) {
                        if ( typeof context.getElementsByName !== strundefined ) {
                                return context.getElementsByName( name );
                        }
                },

                "CLASS": assertUsableClassName && function( className, context, xml ) {
                        if ( typeof context.getElementsByClassName !== strundefined && !xml ) {
                                return context.getElementsByClassName( className );
                        }
                }
        },

        relative: {
                ">": { dir: "parentNode", first: true },
                " ": { dir: "parentNode" },
                "+": { dir: "previousSibling", first: true },
                "~": { dir: "previousSibling" }
        },

        preFilter: {
                "ATTR": function( match ) {
                        match[1] = match[1].replace( rbackslash, "" );

                        // Move the given value to match[3] whether quoted or unquoted
                        match[3] = ( match[4] || match[5] || "" ).replace( rbackslash, "" );

                        if ( match[2] === "~=" ) {
                                match[3] = " " + match[3] + " ";
                        }

                        return match.slice( 0, 4 );
                },

                "CHILD": function( match ) {
                        /* matches from matchExpr["CHILD"]
                                1 type (only|nth|...)
                                2 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
                                3 xn-component of xn+y argument ([+-]?\d*n|)
                                4 sign of xn-component
                                5 x of xn-component
                                6 sign of y-component
                                7 y of y-component
                        */
                        match[1] = match[1].toLowerCase();

                        if ( match[1] === "nth" ) {
                                // nth-child requires argument
                                if ( !match[2] ) {
                                        Sizzle.error( match[0] );
                                }

                                // numeric x and y parameters for Expr.filter.CHILD
                                // remember that false/true cast respectively to 0/1
                                match[3] = +( match[3] ? match[4] + (match[5] || 1) : 2 * ( match[2] === "even" || match[2] === "odd" ) );
                                match[4] = +( ( match[6] + match[7] ) || match[2] === "odd" );

                        // other types prohibit arguments
                        } else if ( match[2] ) {
                                Sizzle.error( match[0] );
                        }

                        return match;
                },

                "PSEUDO": function( match ) {
                        var unquoted, excess;
                        if ( matchExpr["CHILD"].test( match[0] ) ) {
                                return null;
                        }

                        if ( match[3] ) {
                                match[2] = match[3];
                        } else if ( (unquoted = match[4]) ) {
                                // Only check arguments that contain a pseudo
                                if ( rpseudo.test(unquoted) &&
                                        // Get excess from tokenize (recursively)
                                        (excess = tokenize( unquoted, true )) &&
                                        // advance to the next closing parenthesis
                                        (excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

                                        // excess is a negative index
                                        unquoted = unquoted.slice( 0, excess );
                                        match[0] = match[0].slice( 0, excess );
                                }
                                match[2] = unquoted;
                        }

                        // Return only captures needed by the pseudo filter method (type and argument)
                        return match.slice( 0, 3 );
                }
        },

        filter: {
                "ID": assertGetIdNotName ?
                        function( id ) {
                                id = id.replace( rbackslash, "" );
                                return function( elem ) {
                                        return elem.getAttribute("id") === id;
                                };
                        } :
                        function( id ) {
                                id = id.replace( rbackslash, "" );
                                return function( elem ) {
                                        var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
                                        return node && node.value === id;
                                };
                        },

                "TAG": function( nodeName ) {
                        if ( nodeName === "*" ) {
                                return function() { return true; };
                        }
                        nodeName = nodeName.replace( rbackslash, "" ).toLowerCase();

                        return function( elem ) {
                                return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
                        };
                },

                "CLASS": function( className ) {
                        var pattern = classCache[ expando ][ className + " " ];

                        return pattern ||
                                (pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
                                classCache( className, function( elem ) {
                                        return pattern.test( elem.className || (typeof elem.getAttribute !== strundefined && elem.getAttribute("class")) || "" );
                                });
                },

                "ATTR": function( name, operator, check ) {
                        return function( elem, context ) {
                                var result = Sizzle.attr( elem, name );

                                if ( result == null ) {
                                        return operator === "!=";
                                }
                                if ( !operator ) {
                                        return true;
                                }

                                result += "";

                                return operator === "=" ? result === check :
                                        operator === "!=" ? result !== check :
                                        operator === "^=" ? check && result.indexOf( check ) === 0 :
                                        operator === "*=" ? check && result.indexOf( check ) > -1 :
                                        operator === "$=" ? check && result.substr( result.length - check.length ) === check :
                                        operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
                                        operator === "|=" ? result === check || result.substr( 0, check.length + 1 ) === check + "-" :
                                        false;
                        };
                },

                "CHILD": function( type, argument, first, last ) {

                        if ( type === "nth" ) {
                                return function( elem ) {
                                        var node, diff,
                                                parent = elem.parentNode;

                                        if ( first === 1 && last === 0 ) {
                                                return true;
                                        }

                                        if ( parent ) {
                                                diff = 0;
                                                for ( node = parent.firstChild; node; node = node.nextSibling ) {
                                                        if ( node.nodeType === 1 ) {
                                                                diff++;
                                                                if ( elem === node ) {
                                                                        break;
                                                                }
                                                        }
                                                }
                                        }

                                        // Incorporate the offset (or cast to NaN), then check against cycle size
                                        diff -= last;
                                        return diff === first || ( diff % first === 0 && diff / first >= 0 );
                                };
                        }

                        return function( elem ) {
                                var node = elem;

                                switch ( type ) {
                                        case "only":
                                        case "first":
                                                while ( (node = node.previousSibling) ) {
                                                        if ( node.nodeType === 1 ) {
                                                                return false;
                                                        }
                                                }

                                                if ( type === "first" ) {
                                                        return true;
                                                }

                                                node = elem;

                                                /* falls through */
                                        case "last":
                                                while ( (node = node.nextSibling) ) {
                                                        if ( node.nodeType === 1 ) {
                                                                return false;
                                                        }
                                                }

                                                return true;
                                }
                        };
                },

                "PSEUDO": function( pseudo, argument ) {
                        // pseudo-class names are case-insensitive
                        // http://www.w3.org/TR/selectors/#pseudo-classes
                        // Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
                        // Remember that setFilters inherits from pseudos
                        var args,
                                fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
                                        Sizzle.error( "unsupported pseudo: " + pseudo );

                        // The user may use createPseudo to indicate that
                        // arguments are needed to create the filter function
                        // just as Sizzle does
                        if ( fn[ expando ] ) {
                                return fn( argument );
                        }

                        // But maintain support for old signatures
                        if ( fn.length > 1 ) {
                                args = [ pseudo, pseudo, "", argument ];
                                return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
                                        markFunction(function( seed, matches ) {
                                                var idx,
                                                        matched = fn( seed, argument ),
                                                        i = matched.length;
                                                while ( i-- ) {
                                                        idx = indexOf.call( seed, matched[i] );
                                                        seed[ idx ] = !( matches[ idx ] = matched[i] );
                                                }
                                        }) :
                                        function( elem ) {
                                                return fn( elem, 0, args );
                                        };
                        }

                        return fn;
                }
        },

        pseudos: {
                "not": markFunction(function( selector ) {
                        // Trim the selector passed to compile
                        // to avoid treating leading and trailing
                        // spaces as combinators
                        var input = [],
                                results = [],
                                matcher = compile( selector.replace( rtrim, "$1" ) );

                        return matcher[ expando ] ?
                                markFunction(function( seed, matches, context, xml ) {
                                        var elem,
                                                unmatched = matcher( seed, null, xml, [] ),
                                                i = seed.length;

                                        // Match elements unmatched by `matcher`
                                        while ( i-- ) {
                                                if ( (elem = unmatched[i]) ) {
                                                        seed[i] = !(matches[i] = elem);
                                                }
                                        }
                                }) :
                                function( elem, context, xml ) {
                                        input[0] = elem;
                                        matcher( input, null, xml, results );
                                        return !results.pop();
                                };
                }),

                "has": markFunction(function( selector ) {
                        return function( elem ) {
                                return Sizzle( selector, elem ).length > 0;
                        };
                }),

                "contains": markFunction(function( text ) {
                        return function( elem ) {
                                return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
                        };
                }),

                "enabled": function( elem ) {
                        return elem.disabled === false;
                },

                "disabled": function( elem ) {
                        return elem.disabled === true;
                },

                "checked": function( elem ) {
                        // In CSS3, :checked should return both checked and selected elements
                        // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
                        var nodeName = elem.nodeName.toLowerCase();
                        return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
                },

                "selected": function( elem ) {
                        // Accessing this property makes selected-by-default
                        // options in Safari work properly
                        if ( elem.parentNode ) {
                                elem.parentNode.selectedIndex;
                        }

                        return elem.selected === true;
                },

                "parent": function( elem ) {
                        return !Expr.pseudos["empty"]( elem );
                },

                "empty": function( elem ) {
                        // http://www.w3.org/TR/selectors/#empty-pseudo
                        // :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
                        //   not comment, processing instructions, or others
                        // Thanks to Diego Perini for the nodeName shortcut
                        //   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
                        var nodeType;
                        elem = elem.firstChild;
                        while ( elem ) {
                                if ( elem.nodeName > "@" || (nodeType = elem.nodeType) === 3 || nodeType === 4 ) {
                                        return false;
                                }
                                elem = elem.nextSibling;
                        }
                        return true;
                },

                "header": function( elem ) {
                        return rheader.test( elem.nodeName );
                },

                "text": function( elem ) {
                        var type, attr;
                        // IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
                        // use getAttribute instead to test this case
                        return elem.nodeName.toLowerCase() === "input" &&
                                (type = elem.type) === "text" &&
                                ( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === type );
                },

                // Input types
                "radio": createInputPseudo("radio"),
                "checkbox": createInputPseudo("checkbox"),
                "file": createInputPseudo("file"),
                "password": createInputPseudo("password"),
                "image": createInputPseudo("image"),

                "submit": createButtonPseudo("submit"),
                "reset": createButtonPseudo("reset"),

                "button": function( elem ) {
                        var name = elem.nodeName.toLowerCase();
                        return name === "input" && elem.type === "button" || name === "button";
                },

                "input": function( elem ) {
                        return rinputs.test( elem.nodeName );
                },

                "focus": function( elem ) {
                        var doc = elem.ownerDocument;
                        return elem === doc.activeElement && (!doc.hasFocus || doc.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
                },

                "active": function( elem ) {
                        return elem === elem.ownerDocument.activeElement;
                },

                // Positional types
                "first": createPositionalPseudo(function() {
                        return [ 0 ];
                }),

                "last": createPositionalPseudo(function( matchIndexes, length ) {
                        return [ length - 1 ];
                }),

                "eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
                        return [ argument < 0 ? argument + length : argument ];
                }),

                "even": createPositionalPseudo(function( matchIndexes, length ) {
                        for ( var i = 0; i < length; i += 2 ) {
                                matchIndexes.push( i );
                        }
                        return matchIndexes;
                }),

                "odd": createPositionalPseudo(function( matchIndexes, length ) {
                        for ( var i = 1; i < length; i += 2 ) {
                                matchIndexes.push( i );
                        }
                        return matchIndexes;
                }),

                "lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
                        for ( var i = argument < 0 ? argument + length : argument; --i >= 0; ) {
                                matchIndexes.push( i );
                        }
                        return matchIndexes;
                }),

                "gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
                        for ( var i = argument < 0 ? argument + length : argument; ++i < length; ) {
                                matchIndexes.push( i );
                        }
                        return matchIndexes;
                })
        }
};

function siblingCheck( a, b, ret ) {
        if ( a === b ) {
                return ret;
        }

        var cur = a.nextSibling;

        while ( cur ) {
                if ( cur === b ) {
                        return -1;
                }

                cur = cur.nextSibling;
        }

        return 1;
}

sortOrder = docElem.compareDocumentPosition ?
        function( a, b ) {
                if ( a === b ) {
                        hasDuplicate = true;
                        return 0;
                }

                return ( !a.compareDocumentPosition || !b.compareDocumentPosition ?
                        a.compareDocumentPosition :
                        a.compareDocumentPosition(b) & 4
                ) ? -1 : 1;
        } :
        function( a, b ) {
                // The nodes are identical, we can exit early
                if ( a === b ) {
                        hasDuplicate = true;
                        return 0;

                // Fallback to using sourceIndex (in IE) if it's available on both nodes
                } else if ( a.sourceIndex && b.sourceIndex ) {
                        return a.sourceIndex - b.sourceIndex;
                }

                var al, bl,
                        ap = [],
                        bp = [],
                        aup = a.parentNode,
                        bup = b.parentNode,
                        cur = aup;

                // If the nodes are siblings (or identical) we can do a quick check
                if ( aup === bup ) {
                        return siblingCheck( a, b );

                // If no parents were found then the nodes are disconnected
                } else if ( !aup ) {
                        return -1;

                } else if ( !bup ) {
                        return 1;
                }

                // Otherwise they're somewhere else in the tree so we need
                // to build up a full list of the parentNodes for comparison
                while ( cur ) {
                        ap.unshift( cur );
                        cur = cur.parentNode;
                }

                cur = bup;

                while ( cur ) {
                        bp.unshift( cur );
                        cur = cur.parentNode;
                }

                al = ap.length;
                bl = bp.length;

                // Start walking down the tree looking for a discrepancy
                for ( var i = 0; i < al && i < bl; i++ ) {
                        if ( ap[i] !== bp[i] ) {
                                return siblingCheck( ap[i], bp[i] );
                        }
                }

                // We ended someplace up the tree so do a sibling check
                return i === al ?
                        siblingCheck( a, bp[i], -1 ) :
                        siblingCheck( ap[i], b, 1 );
        };

// Always assume the presence of duplicates if sort doesn't
// pass them to our comparison function (as in Google Chrome).
[0, 0].sort( sortOrder );
baseHasDuplicate = !hasDuplicate;

// Document sorting and removing duplicates
Sizzle.uniqueSort = function( results ) {
        var elem,
                duplicates = [],
                i = 1,
                j = 0;

        hasDuplicate = baseHasDuplicate;
        results.sort( sortOrder );

        if ( hasDuplicate ) {
                for ( ; (elem = results[i]); i++ ) {
                        if ( elem === results[ i - 1 ] ) {
                                j = duplicates.push( i );
                        }
                }
                while ( j-- ) {
                        results.splice( duplicates[ j ], 1 );
                }
        }

        return results;
};

Sizzle.error = function( msg ) {
        throw new Error( "Syntax error, unrecognized expression: " + msg );
};

function tokenize( selector, parseOnly ) {
        var matched, match, tokens, type,
                soFar, groups, preFilters,
                cached = tokenCache[ expando ][ selector + " " ];

        if ( cached ) {
                return parseOnly ? 0 : cached.slice( 0 );
        }

        soFar = selector;
        groups = [];
        preFilters = Expr.preFilter;

        while ( soFar ) {

                // Comma and first run
                if ( !matched || (match = rcomma.exec( soFar )) ) {
                        if ( match ) {
                                // Don't consume trailing commas as valid
                                soFar = soFar.slice( match[0].length ) || soFar;
                        }
                        groups.push( tokens = [] );
                }

                matched = false;

                // Combinators
                if ( (match = rcombinators.exec( soFar )) ) {
                        tokens.push( matched = new Token( match.shift() ) );
                        soFar = soFar.slice( matched.length );

                        // Cast descendant combinators to space
                        matched.type = match[0].replace( rtrim, " " );
                }

                // Filters
                for ( type in Expr.filter ) {
                        if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
                                (match = preFilters[ type ]( match ))) ) {

                                tokens.push( matched = new Token( match.shift() ) );
                                soFar = soFar.slice( matched.length );
                                matched.type = type;
                                matched.matches = match;
                        }
                }

                if ( !matched ) {
                        break;
                }
        }

        // Return the length of the invalid excess
        // if we're just parsing
        // Otherwise, throw an error or return tokens
        return parseOnly ?
                soFar.length :
                soFar ?
                        Sizzle.error( selector ) :
                        // Cache the tokens
                        tokenCache( selector, groups ).slice( 0 );
}

function addCombinator( matcher, combinator, base ) {
        var dir = combinator.dir,
                checkNonElements = base && combinator.dir === "parentNode",
                doneName = done++;

        return combinator.first ?
                // Check against closest ancestor/preceding element
                function( elem, context, xml ) {
                        while ( (elem = elem[ dir ]) ) {
                                if ( checkNonElements || elem.nodeType === 1  ) {
                                        return matcher( elem, context, xml );
                                }
                        }
                } :

                // Check against all ancestor/preceding elements
                function( elem, context, xml ) {
                        // We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
                        if ( !xml ) {
                                var cache,
                                        dirkey = dirruns + " " + doneName + " ",
                                        cachedkey = dirkey + cachedruns;
                                while ( (elem = elem[ dir ]) ) {
                                        if ( checkNonElements || elem.nodeType === 1 ) {
                                                if ( (cache = elem[ expando ]) === cachedkey ) {
                                                        return elem.sizset;
                                                } else if ( typeof cache === "string" && cache.indexOf(dirkey) === 0 ) {
                                                        if ( elem.sizset ) {
                                                                return elem;
                                                        }
                                                } else {
                                                        elem[ expando ] = cachedkey;
                                                        if ( matcher( elem, context, xml ) ) {
                                                                elem.sizset = true;
                                                                return elem;
                                                        }
                                                        elem.sizset = false;
                                                }
                                        }
                                }
                        } else {
                                while ( (elem = elem[ dir ]) ) {
                                        if ( checkNonElements || elem.nodeType === 1 ) {
                                                if ( matcher( elem, context, xml ) ) {
                                                        return elem;
                                                }
                                        }
                                }
                        }
                };
}

function elementMatcher( matchers ) {
        return matchers.length > 1 ?
                function( elem, context, xml ) {
                        var i = matchers.length;
                        while ( i-- ) {
                                if ( !matchers[i]( elem, context, xml ) ) {
                                        return false;
                                }
                        }
                        return true;
                } :
                matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
        var elem,
                newUnmatched = [],
                i = 0,
                len = unmatched.length,
                mapped = map != null;

        for ( ; i < len; i++ ) {
                if ( (elem = unmatched[i]) ) {
                        if ( !filter || filter( elem, context, xml ) ) {
                                newUnmatched.push( elem );
                                if ( mapped ) {
                                        map.push( i );
                                }
                        }
                }
        }

        return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
        if ( postFilter && !postFilter[ expando ] ) {
                postFilter = setMatcher( postFilter );
        }
        if ( postFinder && !postFinder[ expando ] ) {
                postFinder = setMatcher( postFinder, postSelector );
        }
        return markFunction(function( seed, results, context, xml ) {
                var temp, i, elem,
                        preMap = [],
                        postMap = [],
                        preexisting = results.length,

                        // Get initial elements from seed or context
                        elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

                        // Prefilter to get matcher input, preserving a map for seed-results synchronization
                        matcherIn = preFilter && ( seed || !selector ) ?
                                condense( elems, preMap, preFilter, context, xml ) :
                                elems,

                        matcherOut = matcher ?
                                // If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
                                postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

                                        // ...intermediate processing is necessary
                                        [] :

                                        // ...otherwise use results directly
                                        results :
                                matcherIn;

                // Find primary matches
                if ( matcher ) {
                        matcher( matcherIn, matcherOut, context, xml );
                }

                // Apply postFilter
                if ( postFilter ) {
                        temp = condense( matcherOut, postMap );
                        postFilter( temp, [], context, xml );

                        // Un-match failing elements by moving them back to matcherIn
                        i = temp.length;
                        while ( i-- ) {
                                if ( (elem = temp[i]) ) {
                                        matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
                                }
                        }
                }

                if ( seed ) {
                        if ( postFinder || preFilter ) {
                                if ( postFinder ) {
                                        // Get the final matcherOut by condensing this intermediate into postFinder contexts
                                        temp = [];
                                        i = matcherOut.length;
                                        while ( i-- ) {
                                                if ( (elem = matcherOut[i]) ) {
                                                        // Restore matcherIn since elem is not yet a final match
                                                        temp.push( (matcherIn[i] = elem) );
                                                }
                                        }
                                        postFinder( null, (matcherOut = []), temp, xml );
                                }

                                // Move matched elements from seed to results to keep them synchronized
                                i = matcherOut.length;
                                while ( i-- ) {
                                        if ( (elem = matcherOut[i]) &&
                                                (temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

                                                seed[temp] = !(results[temp] = elem);
                                        }
                                }
                        }

                // Add elements to results, through postFinder if defined
                } else {
                        matcherOut = condense(
                                matcherOut === results ?
                                        matcherOut.splice( preexisting, matcherOut.length ) :
                                        matcherOut
                        );
                        if ( postFinder ) {
                                postFinder( null, results, matcherOut, xml );
                        } else {
                                push.apply( results, matcherOut );
                        }
                }
        });
}

function matcherFromTokens( tokens ) {
        var checkContext, matcher, j,
                len = tokens.length,
                leadingRelative = Expr.relative[ tokens[0].type ],
                implicitRelative = leadingRelative || Expr.relative[" "],
                i = leadingRelative ? 1 : 0,

                // The foundational matcher ensures that elements are reachable from top-level context(s)
                matchContext = addCombinator( function( elem ) {
                        return elem === checkContext;
                }, implicitRelative, true ),
                matchAnyContext = addCombinator( function( elem ) {
                        return indexOf.call( checkContext, elem ) > -1;
                }, implicitRelative, true ),
                matchers = [ function( elem, context, xml ) {
                        return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
                                (checkContext = context).nodeType ?
                                        matchContext( elem, context, xml ) :
                                        matchAnyContext( elem, context, xml ) );
                } ];

        for ( ; i < len; i++ ) {
                if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
                        matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
                } else {
                        matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

                        // Return special upon seeing a positional matcher
                        if ( matcher[ expando ] ) {
                                // Find the next relative operator (if any) for proper handling
                                j = ++i;
                                for ( ; j < len; j++ ) {
                                        if ( Expr.relative[ tokens[j].type ] ) {
                                                break;
                                        }
                                }
                                return setMatcher(
                                        i > 1 && elementMatcher( matchers ),
                                        i > 1 && tokens.slice( 0, i - 1 ).join("").replace( rtrim, "$1" ),
                                        matcher,
                                        i < j && matcherFromTokens( tokens.slice( i, j ) ),
                                        j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
                                        j < len && tokens.join("")
                                );
                        }
                        matchers.push( matcher );
                }
        }

        return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
        var bySet = setMatchers.length > 0,
                byElement = elementMatchers.length > 0,
                superMatcher = function( seed, context, xml, results, expandContext ) {
                        var elem, j, matcher,
                                setMatched = [],
                                matchedCount = 0,
                                i = "0",
                                unmatched = seed && [],
                                outermost = expandContext != null,
                                contextBackup = outermostContext,
                                // We must always have either seed elements or context
                                elems = seed || byElement && Expr.find["TAG"]( "*", expandContext && context.parentNode || context ),
                                // Nested matchers should use non-integer dirruns
                                dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.E);

                        if ( outermost ) {
                                outermostContext = context !== document && context;
                                cachedruns = superMatcher.el;
                        }

                        // Add elements passing elementMatchers directly to results
                        for ( ; (elem = elems[i]) != null; i++ ) {
                                if ( byElement && elem ) {
                                        for ( j = 0; (matcher = elementMatchers[j]); j++ ) {
                                                if ( matcher( elem, context, xml ) ) {
                                                        results.push( elem );
                                                        break;
                                                }
                                        }
                                        if ( outermost ) {
                                                dirruns = dirrunsUnique;
                                                cachedruns = ++superMatcher.el;
                                        }
                                }

                                // Track unmatched elements for set filters
                                if ( bySet ) {
                                        // They will have gone through all possible matchers
                                        if ( (elem = !matcher && elem) ) {
                                                matchedCount--;
                                        }

                                        // Lengthen the array for every element, matched or not
                                        if ( seed ) {
                                                unmatched.push( elem );
                                        }
                                }
                        }

                        // Apply set filters to unmatched elements
                        matchedCount += i;
                        if ( bySet && i !== matchedCount ) {
                                for ( j = 0; (matcher = setMatchers[j]); j++ ) {
                                        matcher( unmatched, setMatched, context, xml );
                                }

                                if ( seed ) {
                                        // Reintegrate element matches to eliminate the need for sorting
                                        if ( matchedCount > 0 ) {
                                                while ( i-- ) {
                                                        if ( !(unmatched[i] || setMatched[i]) ) {
                                                                setMatched[i] = pop.call( results );
                                                        }
                                                }
                                        }

                                        // Discard index placeholder values to get only actual matches
                                        setMatched = condense( setMatched );
                                }

                                // Add matches to results
                                push.apply( results, setMatched );

                                // Seedless set matches succeeding multiple successful matchers stipulate sorting
                                if ( outermost && !seed && setMatched.length > 0 &&
                                        ( matchedCount + setMatchers.length ) > 1 ) {

                                        Sizzle.uniqueSort( results );
                                }
                        }

                        // Override manipulation of globals by nested matchers
                        if ( outermost ) {
                                dirruns = dirrunsUnique;
                                outermostContext = contextBackup;
                        }

                        return unmatched;
                };

        superMatcher.el = 0;
        return bySet ?
                markFunction( superMatcher ) :
                superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
        var i,
                setMatchers = [],
                elementMatchers = [],
                cached = compilerCache[ expando ][ selector + " " ];

        if ( !cached ) {
                // Generate a function of recursive functions that can be used to check each element
                if ( !group ) {
                        group = tokenize( selector );
                }
                i = group.length;
                while ( i-- ) {
                        cached = matcherFromTokens( group[i] );
                        if ( cached[ expando ] ) {
                                setMatchers.push( cached );
                        } else {
                                elementMatchers.push( cached );
                        }
                }

                // Cache the compiled function
                cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
        }
        return cached;
};

function multipleContexts( selector, contexts, results ) {
        var i = 0,
                len = contexts.length;
        for ( ; i < len; i++ ) {
                Sizzle( selector, contexts[i], results );
        }
        return results;
}

function select( selector, context, results, seed, xml ) {
        var i, tokens, token, type, find,
                match = tokenize( selector ),
                j = match.length;

        if ( !seed ) {
                // Try to minimize operations if there is only one group
                if ( match.length === 1 ) {

                        // Take a shortcut and set the context if the root selector is an ID
                        tokens = match[0] = match[0].slice( 0 );
                        if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
                                        context.nodeType === 9 && !xml &&
                                        Expr.relative[ tokens[1].type ] ) {

                                context = Expr.find["ID"]( token.matches[0].replace( rbackslash, "" ), context, xml )[0];
                                if ( !context ) {
                                        return results;
                                }

                                selector = selector.slice( tokens.shift().length );
                        }

                        // Fetch a seed set for right-to-left matching
                        for ( i = matchExpr["POS"].test( selector ) ? -1 : tokens.length - 1; i >= 0; i-- ) {
                                token = tokens[i];

                                // Abort if we hit a combinator
                                if ( Expr.relative[ (type = token.type) ] ) {
                                        break;
                                }
                                if ( (find = Expr.find[ type ]) ) {
                                        // Search, expanding context for leading sibling combinators
                                        if ( (seed = find(
                                                token.matches[0].replace( rbackslash, "" ),
                                                rsibling.test( tokens[0].type ) && context.parentNode || context,
                                                xml
                                        )) ) {

                                                // If seed is empty or no tokens remain, we can return early
                                                tokens.splice( i, 1 );
                                                selector = seed.length && tokens.join("");
                                                if ( !selector ) {
                                                        push.apply( results, slice.call( seed, 0 ) );
                                                        return results;
                                                }

                                                break;
                                        }
                                }
                        }
                }
        }

        // Compile and execute a filtering function
        // Provide `match` to avoid retokenization if we modified the selector above
        compile( selector, match )(
                seed,
                context,
                xml,
                results,
                rsibling.test( selector )
        );
        return results;
}

if ( document.querySelectorAll ) {
        (function() {
                var disconnectedMatch,
                        oldSelect = select,
                        rescape = /'|\\/g,
                        rattributeQuotes = /\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,

                        // qSa(:focus) reports false when true (Chrome 21), no need to also add to buggyMatches since matches checks buggyQSA
                        // A support test would require too much code (would include document ready)
                        rbuggyQSA = [ ":focus" ],

                        // matchesSelector(:active) reports false when true (IE9/Opera 11.5)
                        // A support test would require too much code (would include document ready)
                        // just skip matchesSelector for :active
                        rbuggyMatches = [ ":active" ],
                        matches = docElem.matchesSelector ||
                                docElem.mozMatchesSelector ||
                                docElem.webkitMatchesSelector ||
                                docElem.oMatchesSelector ||
                                docElem.msMatchesSelector;

                // Build QSA regex
                // Regex strategy adopted from Diego Perini
                assert(function( div ) {
                        // Select is set to empty string on purpose
                        // This is to test IE's treatment of not explictly
                        // setting a boolean content attribute,
                        // since its presence should be enough
                        // http://bugs.jquery.com/ticket/12359
                        div.innerHTML = "<select><option selected=''></option></select>";

                        // IE8 - Some boolean attributes are not treated correctly
                        if ( !div.querySelectorAll("[selected]").length ) {
                                rbuggyQSA.push( "\\[" + whitespace + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)" );
                        }

                        // Webkit/Opera - :checked should return selected option elements
                        // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
                        // IE8 throws error here (do not put tests after this one)
                        if ( !div.querySelectorAll(":checked").length ) {
                                rbuggyQSA.push(":checked");
                        }
                });

                assert(function( div ) {

                        // Opera 10-12/IE9 - ^= $= *= and empty values
                        // Should not select anything
                        div.innerHTML = "<p test=''></p>";
                        if ( div.querySelectorAll("[test^='']").length ) {
                                rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\"\"|'')" );
                        }

                        // FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
                        // IE8 throws error here (do not put tests after this one)
                        div.innerHTML = "<input type='hidden'/>";
                        if ( !div.querySelectorAll(":enabled").length ) {
                                rbuggyQSA.push(":enabled", ":disabled");
                        }
                });

                // rbuggyQSA always contains :focus, so no need for a length check
                rbuggyQSA = /* rbuggyQSA.length && */ new RegExp( rbuggyQSA.join("|") );

                select = function( selector, context, results, seed, xml ) {
                        // Only use querySelectorAll when not filtering,
                        // when this is not xml,
                        // and when no QSA bugs apply
                        if ( !seed && !xml && !rbuggyQSA.test( selector ) ) {
                                var groups, i,
                                        old = true,
                                        nid = expando,
                                        newContext = context,
                                        newSelector = context.nodeType === 9 && selector;

                                // qSA works strangely on Element-rooted queries
                                // We can work around this by specifying an extra ID on the root
                                // and working up from there (Thanks to Andrew Dupont for the technique)
                                // IE 8 doesn't work on object elements
                                if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
                                        groups = tokenize( selector );

                                        if ( (old = context.getAttribute("id")) ) {
                                                nid = old.replace( rescape, "\\$&" );
                                        } else {
                                                context.setAttribute( "id", nid );
                                        }
                                        nid = "[id='" + nid + "'] ";

                                        i = groups.length;
                                        while ( i-- ) {
                                                groups[i] = nid + groups[i].join("");
                                        }
                                        newContext = rsibling.test( selector ) && context.parentNode || context;
                                        newSelector = groups.join(",");
                                }

                                if ( newSelector ) {
                                        try {
                                                push.apply( results, slice.call( newContext.querySelectorAll(
                                                        newSelector
                                                ), 0 ) );
                                                return results;
                                        } catch(qsaError) {
                                        } finally {
                                                if ( !old ) {
                                                        context.removeAttribute("id");
                                                }
                                        }
                                }
                        }

                        return oldSelect( selector, context, results, seed, xml );
                };

                if ( matches ) {
                        assert(function( div ) {
                                // Check to see if it's possible to do matchesSelector
                                // on a disconnected node (IE 9)
                                disconnectedMatch = matches.call( div, "div" );

                                // This should fail with an exception
                                // Gecko does not error, returns false instead
                                try {
                                        matches.call( div, "[test!='']:sizzle" );
                                        rbuggyMatches.push( "!=", pseudos );
                                } catch ( e ) {}
                        });

                        // rbuggyMatches always contains :active and :focus, so no need for a length check
                        rbuggyMatches = /* rbuggyMatches.length && */ new RegExp( rbuggyMatches.join("|") );

                        Sizzle.matchesSelector = function( elem, expr ) {
                                // Make sure that attribute selectors are quoted
                                expr = expr.replace( rattributeQuotes, "='$1']" );

                                // rbuggyMatches always contains :active, so no need for an existence check
                                if ( !isXML( elem ) && !rbuggyMatches.test( expr ) && !rbuggyQSA.test( expr ) ) {
                                        try {
                                                var ret = matches.call( elem, expr );

                                                // IE 9's matchesSelector returns false on disconnected nodes
                                                if ( ret || disconnectedMatch ||
                                                                // As well, disconnected nodes are said to be in a document
                                                                // fragment in IE 9
                                                                elem.document && elem.document.nodeType !== 11 ) {
                                                        return ret;
                                                }
                                        } catch(e) {}
                                }

                                return Sizzle( expr, null, null, [ elem ] ).length > 0;
                        };
                }
        })();
}

// Deprecated
Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Back-compat
function setFilters() {}
Expr.filters = setFilters.prototype = Expr.pseudos;
Expr.setFilters = new setFilters();

// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})( window );
var runtil = /Until$/,
        rparentsprev = /^(?:parents|prev(?:Until|All))/,
        isSimple = /^.[^:#\[\.,]*$/,
        rneedsContext = jQuery.expr.match.needsContext,
        // methods guaranteed to produce a unique set when starting from a unique set
        guaranteedUnique = {
                children: true,
                contents: true,
                next: true,
                prev: true
        };

jQuery.fn.extend({
        find: function( selector ) {
                var i, l, length, n, r, ret,
                        self = this;

                if ( typeof selector !== "string" ) {
                        return jQuery( selector ).filter(function() {
                                for ( i = 0, l = self.length; i < l; i++ ) {
                                        if ( jQuery.contains( self[ i ], this ) ) {
                                                return true;
                                        }
                                }
                        });
                }

                ret = this.pushStack( "", "find", selector );

                for ( i = 0, l = this.length; i < l; i++ ) {
                        length = ret.length;
                        jQuery.find( selector, this[i], ret );

                        if ( i > 0 ) {
                                // Make sure that the results are unique
                                for ( n = length; n < ret.length; n++ ) {
                                        for ( r = 0; r < length; r++ ) {
                                                if ( ret[r] === ret[n] ) {
                                                        ret.splice(n--, 1);
                                                        break;
                                                }
                                        }
                                }
                        }
                }

                return ret;
        },

        has: function( target ) {
                var i,
                        targets = jQuery( target, this ),
                        len = targets.length;

                return this.filter(function() {
                        for ( i = 0; i < len; i++ ) {
                                if ( jQuery.contains( this, targets[i] ) ) {
                                        return true;
                                }
                        }
                });
        },

        not: function( selector ) {
                return this.pushStack( winnow(this, selector, false), "not", selector);
        },

        filter: function( selector ) {
                return this.pushStack( winnow(this, selector, true), "filter", selector );
        },

        is: function( selector ) {
                return !!selector && (
                        typeof selector === "string" ?
                                // If this is a positional/relative selector, check membership in the returned set
                                // so $("p:first").is("p:last") won't return true for a doc with two "p".
                                rneedsContext.test( selector ) ?
                                        jQuery( selector, this.context ).index( this[0] ) >= 0 :
                                        jQuery.filter( selector, this ).length > 0 :
                                this.filter( selector ).length > 0 );
        },

        closest: function( selectors, context ) {
                var cur,
                        i = 0,
                        l = this.length,
                        ret = [],
                        pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
                                jQuery( selectors, context || this.context ) :
                                0;

                for ( ; i < l; i++ ) {
                        cur = this[i];

                        while ( cur && cur.ownerDocument && cur !== context && cur.nodeType !== 11 ) {
                                if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
                                        ret.push( cur );
                                        break;
                                }
                                cur = cur.parentNode;
                        }
                }

                ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

                return this.pushStack( ret, "closest", selectors );
        },

        // Determine the position of an element within
        // the matched set of elements
        index: function( elem ) {

                // No argument, return index in parent
                if ( !elem ) {
                        return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
                }

                // index in selector
                if ( typeof elem === "string" ) {
                        return jQuery.inArray( this[0], jQuery( elem ) );
                }

                // Locate the position of the desired element
                return jQuery.inArray(
                        // If it receives a jQuery object, the first element is used
                        elem.jquery ? elem[0] : elem, this );
        },

        add: function( selector, context ) {
                var set = typeof selector === "string" ?
                                jQuery( selector, context ) :
                                jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
                        all = jQuery.merge( this.get(), set );

                return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
                        all :
                        jQuery.unique( all ) );
        },

        addBack: function( selector ) {
                return this.add( selector == null ?
                        this.prevObject : this.prevObject.filter(selector)
                );
        }
});

jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
        return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

function sibling( cur, dir ) {
        do {
                cur = cur[ dir ];
        } while ( cur && cur.nodeType !== 1 );

        return cur;
}

jQuery.each({
        parent: function( elem ) {
                var parent = elem.parentNode;
                return parent && parent.nodeType !== 11 ? parent : null;
        },
        parents: function( elem ) {
                return jQuery.dir( elem, "parentNode" );
        },
        parentsUntil: function( elem, i, until ) {
                return jQuery.dir( elem, "parentNode", until );
        },
        next: function( elem ) {
                return sibling( elem, "nextSibling" );
        },
        prev: function( elem ) {
                return sibling( elem, "previousSibling" );
        },
        nextAll: function( elem ) {
                return jQuery.dir( elem, "nextSibling" );
        },
        prevAll: function( elem ) {
                return jQuery.dir( elem, "previousSibling" );
        },
        nextUntil: function( elem, i, until ) {
                return jQuery.dir( elem, "nextSibling", until );
        },
        prevUntil: function( elem, i, until ) {
                return jQuery.dir( elem, "previousSibling", until );
        },
        siblings: function( elem ) {
                return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
        },
        children: function( elem ) {
                return jQuery.sibling( elem.firstChild );
        },
        contents: function( elem ) {
                return jQuery.nodeName( elem, "iframe" ) ?
                        elem.contentDocument || elem.contentWindow.document :
                        jQuery.merge( [], elem.childNodes );
        }
}, function( name, fn ) {
        jQuery.fn[ name ] = function( until, selector ) {
                var ret = jQuery.map( this, fn, until );

                if ( !runtil.test( name ) ) {
                        selector = until;
                }

                if ( selector && typeof selector === "string" ) {
                        ret = jQuery.filter( selector, ret );
                }

                ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

                if ( this.length > 1 && rparentsprev.test( name ) ) {
                        ret = ret.reverse();
                }

                return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
        };
});

jQuery.extend({
        filter: function( expr, elems, not ) {
                if ( not ) {
                        expr = ":not(" + expr + ")";
                }

                return elems.length === 1 ?
                        jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
                        jQuery.find.matches(expr, elems);
        },

        dir: function( elem, dir, until ) {
                var matched = [],
                        cur = elem[ dir ];

                while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
                        if ( cur.nodeType === 1 ) {
                                matched.push( cur );
                        }
                        cur = cur[dir];
                }
                return matched;
        },

        sibling: function( n, elem ) {
                var r = [];

                for ( ; n; n = n.nextSibling ) {
                        if ( n.nodeType === 1 && n !== elem ) {
                                r.push( n );
                        }
                }

                return r;
        }
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

        // Can't pass null or undefined to indexOf in Firefox 4
        // Set to 0 to skip string check
        qualifier = qualifier || 0;

        if ( jQuery.isFunction( qualifier ) ) {
                return jQuery.grep(elements, function( elem, i ) {
                        var retVal = !!qualifier.call( elem, i, elem );
                        return retVal === keep;
                });

        } else if ( qualifier.nodeType ) {
                return jQuery.grep(elements, function( elem, i ) {
                        return ( elem === qualifier ) === keep;
                });

        } else if ( typeof qualifier === "string" ) {
                var filtered = jQuery.grep(elements, function( elem ) {
                        return elem.nodeType === 1;
                });

                if ( isSimple.test( qualifier ) ) {
                        return jQuery.filter(qualifier, filtered, !keep);
                } else {
                        qualifier = jQuery.filter( qualifier, filtered );
                }
        }

        return jQuery.grep(elements, function( elem, i ) {
                return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
        });
}
function createSafeFragment( document ) {
        var list = nodeNames.split( "|" ),
        safeFrag = document.createDocumentFragment();

        if ( safeFrag.createElement ) {
                while ( list.length ) {
                        safeFrag.createElement(
                                list.pop()
                        );
                }
        }
        return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
                "header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
        rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
        rleadingWhitespace = /^\s+/,
        rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
        rtagName = /<([\w:]+)/,
        rtbody = /<tbody/i,
        rhtml = /<|&#?\w+;/,
        rnoInnerhtml = /<(?:script|style|link)/i,
        rnocache = /<(?:script|object|embed|option|style)/i,
        rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
        rcheckableType = /^(?:checkbox|radio)$/,
        // checked="checked" or checked
        rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
        rscriptType = /\/(java|ecma)script/i,
        rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,
        wrapMap = {
                option: [ 1, "<select multiple='multiple'>", "</select>" ],
                legend: [ 1, "<fieldset>", "</fieldset>" ],
                thead: [ 1, "<table>", "</table>" ],
                tr: [ 2, "<table><tbody>", "</tbody></table>" ],
                td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
                col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
                area: [ 1, "<map>", "</map>" ],
                _default: [ 0, "", "" ]
        },
        safeFragment = createSafeFragment( document ),
        fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
// unless wrapped in a div with non-breaking characters in front of it.
if ( !jQuery.support.htmlSerialize ) {
        wrapMap._default = [ 1, "X<div>", "</div>" ];
}

jQuery.fn.extend({
        text: function( value ) {
                return jQuery.access( this, function( value ) {
                        return value === undefined ?
                                jQuery.text( this ) :
                                this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
                }, null, value, arguments.length );
        },

        wrapAll: function( html ) {
                if ( jQuery.isFunction( html ) ) {
                        return this.each(function(i) {
                                jQuery(this).wrapAll( html.call(this, i) );
                        });
                }

                if ( this[0] ) {
                        // The elements to wrap the target around
                        var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

                        if ( this[0].parentNode ) {
                                wrap.insertBefore( this[0] );
                        }

                        wrap.map(function() {
                                var elem = this;

                                while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
                                        elem = elem.firstChild;
                                }

                                return elem;
                        }).append( this );
                }

                return this;
        },

        wrapInner: function( html ) {
                if ( jQuery.isFunction( html ) ) {
                        return this.each(function(i) {
                                jQuery(this).wrapInner( html.call(this, i) );
                        });
                }

                return this.each(function() {
                        var self = jQuery( this ),
                                contents = self.contents();

                        if ( contents.length ) {
                                contents.wrapAll( html );

                        } else {
                                self.append( html );
                        }
                });
        },

        wrap: function( html ) {
                var isFunction = jQuery.isFunction( html );

                return this.each(function(i) {
                        jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
                });
        },

        unwrap: function() {
                return this.parent().each(function() {
                        if ( !jQuery.nodeName( this, "body" ) ) {
                                jQuery( this ).replaceWith( this.childNodes );
                        }
                }).end();
        },

        append: function() {
                return this.domManip(arguments, true, function( elem ) {
                        if ( this.nodeType === 1 || this.nodeType === 11 ) {
                                this.appendChild( elem );
                        }
                });
        },

        prepend: function() {
                return this.domManip(arguments, true, function( elem ) {
                        if ( this.nodeType === 1 || this.nodeType === 11 ) {
                                this.insertBefore( elem, this.firstChild );
                        }
                });
        },

        before: function() {
                if ( !isDisconnected( this[0] ) ) {
                        return this.domManip(arguments, false, function( elem ) {
                                this.parentNode.insertBefore( elem, this );
                        });
                }

                if ( arguments.length ) {
                        var set = jQuery.clean( arguments );
                        return this.pushStack( jQuery.merge( set, this ), "before", this.selector );
                }
        },

        after: function() {
                if ( !isDisconnected( this[0] ) ) {
                        return this.domManip(arguments, false, function( elem ) {
                                this.parentNode.insertBefore( elem, this.nextSibling );
                        });
                }

                if ( arguments.length ) {
                        var set = jQuery.clean( arguments );
                        return this.pushStack( jQuery.merge( this, set ), "after", this.selector );
                }
        },

        // keepData is for internal use only--do not document
        remove: function( selector, keepData ) {
                var elem,
                        i = 0;

                for ( ; (elem = this[i]) != null; i++ ) {
                        if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
                                if ( !keepData && elem.nodeType === 1 ) {
                                        jQuery.cleanData( elem.getElementsByTagName("*") );
                                        jQuery.cleanData( [ elem ] );
                                }

                                if ( elem.parentNode ) {
                                        elem.parentNode.removeChild( elem );
                                }
                        }
                }

                return this;
        },

        empty: function() {
                var elem,
                        i = 0;

                for ( ; (elem = this[i]) != null; i++ ) {
                        // Remove element nodes and prevent memory leaks
                        if ( elem.nodeType === 1 ) {
                                jQuery.cleanData( elem.getElementsByTagName("*") );
                        }

                        // Remove any remaining nodes
                        while ( elem.firstChild ) {
                                elem.removeChild( elem.firstChild );
                        }
                }

                return this;
        },

        clone: function( dataAndEvents, deepDataAndEvents ) {
                dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
                deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

                return this.map( function () {
                        return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
                });
        },

        html: function( value ) {
                return jQuery.access( this, function( value ) {
                        var elem = this[0] || {},
                                i = 0,
                                l = this.length;

                        if ( value === undefined ) {
                                return elem.nodeType === 1 ?
                                        elem.innerHTML.replace( rinlinejQuery, "" ) :
                                        undefined;
                        }

                        // See if we can take a shortcut and just use innerHTML
                        if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
                                ( jQuery.support.htmlSerialize || !rnoshimcache.test( value )  ) &&
                                ( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
                                !wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

                                value = value.replace( rxhtmlTag, "<$1></$2>" );

                                try {
                                        for (; i < l; i++ ) {
                                                // Remove element nodes and prevent memory leaks
                                                elem = this[i] || {};
                                                if ( elem.nodeType === 1 ) {
                                                        jQuery.cleanData( elem.getElementsByTagName( "*" ) );
                                                        elem.innerHTML = value;
                                                }
                                        }

                                        elem = 0;

                                // If using innerHTML throws an exception, use the fallback method
                                } catch(e) {}
                        }

                        if ( elem ) {
                                this.empty().append( value );
                        }
                }, null, value, arguments.length );
        },

        replaceWith: function( value ) {
                if ( !isDisconnected( this[0] ) ) {
                        // Make sure that the elements are removed from the DOM before they are inserted
                        // this can help fix replacing a parent with child elements
                        if ( jQuery.isFunction( value ) ) {
                                return this.each(function(i) {
                                        var self = jQuery(this), old = self.html();
                                        self.replaceWith( value.call( this, i, old ) );
                                });
                        }

                        if ( typeof value !== "string" ) {
                                value = jQuery( value ).detach();
                        }

                        return this.each(function() {
                                var next = this.nextSibling,
                                        parent = this.parentNode;

                                jQuery( this ).remove();

                                if ( next ) {
                                        jQuery(next).before( value );
                                } else {
                                        jQuery(parent).append( value );
                                }
                        });
                }

                return this.length ?
                        this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
                        this;
        },

        detach: function( selector ) {
                return this.remove( selector, true );
        },

        domManip: function( args, table, callback ) {

                // Flatten any nested arrays
                args = [].concat.apply( [], args );

                var results, first, fragment, iNoClone,
                        i = 0,
                        value = args[0],
                        scripts = [],
                        l = this.length;

                // We can't cloneNode fragments that contain checked, in WebKit
                if ( !jQuery.support.checkClone && l > 1 && typeof value === "string" && rchecked.test( value ) ) {
                        return this.each(function() {
                                jQuery(this).domManip( args, table, callback );
                        });
                }

                if ( jQuery.isFunction(value) ) {
                        return this.each(function(i) {
                                var self = jQuery(this);
                                args[0] = value.call( this, i, table ? self.html() : undefined );
                                self.domManip( args, table, callback );
                        });
                }

                if ( this[0] ) {
                        results = jQuery.buildFragment( args, this, scripts );
                        fragment = results.fragment;
                        first = fragment.firstChild;

                        if ( fragment.childNodes.length === 1 ) {
                                fragment = first;
                        }

                        if ( first ) {
                                table = table && jQuery.nodeName( first, "tr" );

                                // Use the original fragment for the last item instead of the first because it can end up
                                // being emptied incorrectly in certain situations (#8070).
                                // Fragments from the fragment cache must always be cloned and never used in place.
                                for ( iNoClone = results.cacheable || l - 1; i < l; i++ ) {
                                        callback.call(
                                                table && jQuery.nodeName( this[i], "table" ) ?
                                                        findOrAppend( this[i], "tbody" ) :
                                                        this[i],
                                                i === iNoClone ?
                                                        fragment :
                                                        jQuery.clone( fragment, true, true )
                                        );
                                }
                        }

                        // Fix #11809: Avoid leaking memory
                        fragment = first = null;

                        if ( scripts.length ) {
                                jQuery.each( scripts, function( i, elem ) {
                                        if ( elem.src ) {
                                                if ( jQuery.ajax ) {
                                                        jQuery.ajax({
                                                                url: elem.src,
                                                                type: "GET",
                                                                dataType: "script",
                                                                async: false,
                                                                global: false,
                                                                "throws": true
                                                        });
                                                } else {
                                                        jQuery.error("no ajax");
                                                }
                                        } else {
                                                jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "" ) );
                                        }

                                        if ( elem.parentNode ) {
                                                elem.parentNode.removeChild( elem );
                                        }
                                });
                        }
                }

                return this;
        }
});

function findOrAppend( elem, tag ) {
        return elem.getElementsByTagName( tag )[0] || elem.appendChild( elem.ownerDocument.createElement( tag ) );
}

function cloneCopyEvent( src, dest ) {

        if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
                return;
        }

        var type, i, l,
                oldData = jQuery._data( src ),
                curData = jQuery._data( dest, oldData ),
                events = oldData.events;

        if ( events ) {
                delete curData.handle;
                curData.events = {};

                for ( type in events ) {
                        for ( i = 0, l = events[ type ].length; i < l; i++ ) {
                                jQuery.event.add( dest, type, events[ type ][ i ] );
                        }
                }
        }

        // make the cloned public data object a copy from the original
        if ( curData.data ) {
                curData.data = jQuery.extend( {}, curData.data );
        }
}

function cloneFixAttributes( src, dest ) {
        var nodeName;

        // We do not need to do anything for non-Elements
        if ( dest.nodeType !== 1 ) {
                return;
        }

        // clearAttributes removes the attributes, which we don't want,
        // but also removes the attachEvent events, which we *do* want
        if ( dest.clearAttributes ) {
                dest.clearAttributes();
        }

        // mergeAttributes, in contrast, only merges back on the
        // original attributes, not the events
        if ( dest.mergeAttributes ) {
                dest.mergeAttributes( src );
        }

        nodeName = dest.nodeName.toLowerCase();

        if ( nodeName === "object" ) {
                // IE6-10 improperly clones children of object elements using classid.
                // IE10 throws NoModificationAllowedError if parent is null, #12132.
                if ( dest.parentNode ) {
                        dest.outerHTML = src.outerHTML;
                }

                // This path appears unavoidable for IE9. When cloning an object
                // element in IE9, the outerHTML strategy above is not sufficient.
                // If the src has innerHTML and the destination does not,
                // copy the src.innerHTML into the dest.innerHTML. #10324
                if ( jQuery.support.html5Clone && (src.innerHTML && !jQuery.trim(dest.innerHTML)) ) {
                        dest.innerHTML = src.innerHTML;
                }

        } else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
                // IE6-8 fails to persist the checked state of a cloned checkbox
                // or radio button. Worse, IE6-7 fail to give the cloned element
                // a checked appearance if the defaultChecked value isn't also set

                dest.defaultChecked = dest.checked = src.checked;

                // IE6-7 get confused and end up setting the value of a cloned
                // checkbox/radio button to an empty string instead of "on"
                if ( dest.value !== src.value ) {
                        dest.value = src.value;
                }

        // IE6-8 fails to return the selected option to the default selected
        // state when cloning options
        } else if ( nodeName === "option" ) {
                dest.selected = src.defaultSelected;

        // IE6-8 fails to set the defaultValue to the correct value when
        // cloning other types of input fields
        } else if ( nodeName === "input" || nodeName === "textarea" ) {
                dest.defaultValue = src.defaultValue;

        // IE blanks contents when cloning scripts
        } else if ( nodeName === "script" && dest.text !== src.text ) {
                dest.text = src.text;
        }

        // Event data gets referenced instead of copied if the expando
        // gets copied too
        dest.removeAttribute( jQuery.expando );
}

jQuery.buildFragment = function( args, context, scripts ) {
        var fragment, cacheable, cachehit,
                first = args[ 0 ];

        // Set context from what may come in as undefined or a jQuery collection or a node
        // Updated to fix #12266 where accessing context[0] could throw an exception in IE9/10 &
        // also doubles as fix for #8950 where plain objects caused createDocumentFragment exception
        context = context || document;
        context = !context.nodeType && context[0] || context;
        context = context.ownerDocument || context;

        // Only cache "small" (1/2 KB) HTML strings that are associated with the main document
        // Cloning options loses the selected state, so don't cache them
        // IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
        // Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
        // Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
        if ( args.length === 1 && typeof first === "string" && first.length < 512 && context === document &&
                first.charAt(0) === "<" && !rnocache.test( first ) &&
                (jQuery.support.checkClone || !rchecked.test( first )) &&
                (jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

                // Mark cacheable and look for a hit
                cacheable = true;
                fragment = jQuery.fragments[ first ];
                cachehit = fragment !== undefined;
        }

        if ( !fragment ) {
                fragment = context.createDocumentFragment();
                jQuery.clean( args, context, fragment, scripts );

                // Update the cache, but only store false
                // unless this is a second parsing of the same content
                if ( cacheable ) {
                        jQuery.fragments[ first ] = cachehit && fragment;
                }
        }

        return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
        appendTo: "append",
        prependTo: "prepend",
        insertBefore: "before",
        insertAfter: "after",
        replaceAll: "replaceWith"
}, function( name, original ) {
        jQuery.fn[ name ] = function( selector ) {
                var elems,
                        i = 0,
                        ret = [],
                        insert = jQuery( selector ),
                        l = insert.length,
                        parent = this.length === 1 && this[0].parentNode;

                if ( (parent == null || parent && parent.nodeType === 11 && parent.childNodes.length === 1) && l === 1 ) {
                        insert[ original ]( this[0] );
                        return this;
                } else {
                        for ( ; i < l; i++ ) {
                                elems = ( i > 0 ? this.clone(true) : this ).get();
                                jQuery( insert[i] )[ original ]( elems );
                                ret = ret.concat( elems );
                        }

                        return this.pushStack( ret, name, insert.selector );
                }
        };
});

function getAll( elem ) {
        if ( typeof elem.getElementsByTagName !== "undefined" ) {
                return elem.getElementsByTagName( "*" );

        } else if ( typeof elem.querySelectorAll !== "undefined" ) {
                return elem.querySelectorAll( "*" );

        } else {
                return [];
        }
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
        if ( rcheckableType.test( elem.type ) ) {
                elem.defaultChecked = elem.checked;
        }
}

jQuery.extend({
        clone: function( elem, dataAndEvents, deepDataAndEvents ) {
                var srcElements,
                        destElements,
                        i,
                        clone;

                if ( jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
                        clone = elem.cloneNode( true );

                // IE<=8 does not properly clone detached, unknown element nodes
                } else {
                        fragmentDiv.innerHTML = elem.outerHTML;
                        fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
                }

                if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
                                (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
                        // IE copies events bound via attachEvent when using cloneNode.
                        // Calling detachEvent on the clone will also remove the events
                        // from the original. In order to get around this, we use some
                        // proprietary methods to clear the events. Thanks to MooTools
                        // guys for this hotness.

                        cloneFixAttributes( elem, clone );

                        // Using Sizzle here is crazy slow, so we use getElementsByTagName instead
                        srcElements = getAll( elem );
                        destElements = getAll( clone );

                        // Weird iteration because IE will replace the length property
                        // with an element if you are cloning the body and one of the
                        // elements on the page has a name or id of "length"
                        for ( i = 0; srcElements[i]; ++i ) {
                                // Ensure that the destination node is not null; Fixes #9587
                                if ( destElements[i] ) {
                                        cloneFixAttributes( srcElements[i], destElements[i] );
                                }
                        }
                }

                // Copy the events from the original to the clone
                if ( dataAndEvents ) {
                        cloneCopyEvent( elem, clone );

                        if ( deepDataAndEvents ) {
                                srcElements = getAll( elem );
                                destElements = getAll( clone );

                                for ( i = 0; srcElements[i]; ++i ) {
                                        cloneCopyEvent( srcElements[i], destElements[i] );
                                }
                        }
                }

                srcElements = destElements = null;

                // Return the cloned set
                return clone;
        },

        clean: function( elems, context, fragment, scripts ) {
                var i, j, elem, tag, wrap, depth, div, hasBody, tbody, len, handleScript, jsTags,
                        safe = context === document && safeFragment,
                        ret = [];

                // Ensure that context is a document
                if ( !context || typeof context.createDocumentFragment === "undefined" ) {
                        context = document;
                }

                // Use the already-created safe fragment if context permits
                for ( i = 0; (elem = elems[i]) != null; i++ ) {
                        if ( typeof elem === "number" ) {
                                elem += "";
                        }

                        if ( !elem ) {
                                continue;
                        }

                        // Convert html string into DOM nodes
                        if ( typeof elem === "string" ) {
                                if ( !rhtml.test( elem ) ) {
                                        elem = context.createTextNode( elem );
                                } else {
                                        // Ensure a safe container in which to render the html
                                        safe = safe || createSafeFragment( context );
                                        div = context.createElement("div");
                                        safe.appendChild( div );

                                        // Fix "XHTML"-style tags in all browsers
                                        elem = elem.replace(rxhtmlTag, "<$1></$2>");

                                        // Go to html and back, then peel off extra wrappers
                                        tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase();
                                        wrap = wrapMap[ tag ] || wrapMap._default;
                                        depth = wrap[0];
                                        div.innerHTML = wrap[1] + elem + wrap[2];

                                        // Move to the right depth
                                        while ( depth-- ) {
                                                div = div.lastChild;
                                        }

                                        // Remove IE's autoinserted <tbody> from table fragments
                                        if ( !jQuery.support.tbody ) {

                                                // String was a <table>, *may* have spurious <tbody>
                                                hasBody = rtbody.test(elem);
                                                        tbody = tag === "table" && !hasBody ?
                                                                div.firstChild && div.firstChild.childNodes :

                                                                // String was a bare <thead> or <tfoot>
                                                                wrap[1] === "<table>" && !hasBody ?
                                                                        div.childNodes :
                                                                        [];

                                                for ( j = tbody.length - 1; j >= 0 ; --j ) {
                                                        if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
                                                                tbody[ j ].parentNode.removeChild( tbody[ j ] );
                                                        }
                                                }
                                        }

                                        // IE completely kills leading whitespace when innerHTML is used
                                        if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
                                                div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
                                        }

                                        elem = div.childNodes;

                                        // Take out of fragment container (we need a fresh div each time)
                                        div.parentNode.removeChild( div );
                                }
                        }

                        if ( elem.nodeType ) {
                                ret.push( elem );
                        } else {
                                jQuery.merge( ret, elem );
                        }
                }

                // Fix #11356: Clear elements from safeFragment
                if ( div ) {
                        elem = div = safe = null;
                }

                // Reset defaultChecked for any radios and checkboxes
                // about to be appended to the DOM in IE 6/7 (#8060)
                if ( !jQuery.support.appendChecked ) {
                        for ( i = 0; (elem = ret[i]) != null; i++ ) {
                                if ( jQuery.nodeName( elem, "input" ) ) {
                                        fixDefaultChecked( elem );
                                } else if ( typeof elem.getElementsByTagName !== "undefined" ) {
                                        jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
                                }
                        }
                }

                // Append elements to a provided document fragment
                if ( fragment ) {
                        // Special handling of each script element
                        handleScript = function( elem ) {
                                // Check if we consider it executable
                                if ( !elem.type || rscriptType.test( elem.type ) ) {
                                        // Detach the script and store it in the scripts array (if provided) or the fragment
                                        // Return truthy to indicate that it has been handled
                                        return scripts ?
                                                scripts.push( elem.parentNode ? elem.parentNode.removeChild( elem ) : elem ) :
                                                fragment.appendChild( elem );
                                }
                        };

                        for ( i = 0; (elem = ret[i]) != null; i++ ) {
                                // Check if we're done after handling an executable script
                                if ( !( jQuery.nodeName( elem, "script" ) && handleScript( elem ) ) ) {
                                        // Append to fragment and handle embedded scripts
                                        fragment.appendChild( elem );
                                        if ( typeof elem.getElementsByTagName !== "undefined" ) {
                                                // handleScript alters the DOM, so use jQuery.merge to ensure snapshot iteration
                                                jsTags = jQuery.grep( jQuery.merge( [], elem.getElementsByTagName("script") ), handleScript );

                                                // Splice the scripts into ret after their former ancestor and advance our index beyond them
                                                ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
                                                i += jsTags.length;
                                        }
                                }
                        }
                }

                return ret;
        },

        cleanData: function( elems, /* internal */ acceptData ) {
                var data, id, elem, type,
                        i = 0,
                        internalKey = jQuery.expando,
                        cache = jQuery.cache,
                        deleteExpando = jQuery.support.deleteExpando,
                        special = jQuery.event.special;

                for ( ; (elem = elems[i]) != null; i++ ) {

                        if ( acceptData || jQuery.acceptData( elem ) ) {

                                id = elem[ internalKey ];
                                data = id && cache[ id ];

                                if ( data ) {
                                        if ( data.events ) {
                                                for ( type in data.events ) {
                                                        if ( special[ type ] ) {
                                                                jQuery.event.remove( elem, type );

                                                        // This is a shortcut to avoid jQuery.event.remove's overhead
                                                        } else {
                                                                jQuery.removeEvent( elem, type, data.handle );
                                                        }
                                                }
                                        }

                                        // Remove cache only if it was not already removed by jQuery.event.remove
                                        if ( cache[ id ] ) {

                                                delete cache[ id ];

                                                // IE does not allow us to delete expando properties from nodes,
                                                // nor does it have a removeAttribute function on Document nodes;
                                                // we must handle all of these cases
                                                if ( deleteExpando ) {
                                                        delete elem[ internalKey ];

                                                } else if ( elem.removeAttribute ) {
                                                        elem.removeAttribute( internalKey );

                                                } else {
                                                        elem[ internalKey ] = null;
                                                }

                                                jQuery.deletedIds.push( id );
                                        }
                                }
                        }
                }
        }
});
// Limit scope pollution from any deprecated API
(function() {

var matched, browser;

// Use of jQuery.browser is frowned upon.
// More details: http://api.jquery.com/jQuery.browser
// jQuery.uaMatch maintained for back-compat
jQuery.uaMatch = function( ua ) {
        ua = ua.toLowerCase();

        var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
                /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
                /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
                /(msie) ([\w.]+)/.exec( ua ) ||
                ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
                [];

        return {
                browser: match[ 1 ] || "",
                version: match[ 2 ] || "0"
        };
};

matched = jQuery.uaMatch( navigator.userAgent );
browser = {};

if ( matched.browser ) {
        browser[ matched.browser ] = true;
        browser.version = matched.version;
}

// Chrome is Webkit, but Webkit is also Safari.
if ( browser.chrome ) {
        browser.webkit = true;
} else if ( browser.webkit ) {
        browser.safari = true;
}

jQuery.browser = browser;

jQuery.sub = function() {
        function jQuerySub( selector, context ) {
                return new jQuerySub.fn.init( selector, context );
        }
        jQuery.extend( true, jQuerySub, this );
        jQuerySub.superclass = this;
        jQuerySub.fn = jQuerySub.prototype = this();
        jQuerySub.fn.constructor = jQuerySub;
        jQuerySub.sub = this.sub;
        jQuerySub.fn.init = function init( selector, context ) {
                if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
                        context = jQuerySub( context );
                }

                return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
        };
        jQuerySub.fn.init.prototype = jQuerySub.fn;
        var rootjQuerySub = jQuerySub(document);
        return jQuerySub;
};

})();
var curCSS, iframe, iframeDoc,
        ralpha = /alpha\([^)]*\)/i,
        ropacity = /opacity=([^)]*)/,
        rposition = /^(top|right|bottom|left)$/,
        // swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
        // see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
        rdisplayswap = /^(none|table(?!-c[ea]).+)/,
        rmargin = /^margin/,
        rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" ),
        rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" ),
        rrelNum = new RegExp( "^([-+])=(" + core_pnum + ")", "i" ),
        elemdisplay = { BODY: "block" },

        cssShow = { position: "absolute", visibility: "hidden", display: "block" },
        cssNormalTransform = {
                letterSpacing: 0,
                fontWeight: 400
        },

        cssExpand = [ "Top", "Right", "Bottom", "Left" ],
        cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],

        eventsToggle = jQuery.fn.toggle;

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

        // shortcut for names that are not vendor prefixed
        if ( name in style ) {
                return name;
        }

        // check for vendor prefixed names
        var capName = name.charAt(0).toUpperCase() + name.slice(1),
                origName = name,
                i = cssPrefixes.length;

        while ( i-- ) {
                name = cssPrefixes[ i ] + capName;
                if ( name in style ) {
                        return name;
                }
        }

        return origName;
}

function isHidden( elem, el ) {
        elem = el || elem;
        return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
}

function showHide( elements, show ) {
        var elem, display,
                values = [],
                index = 0,
                length = elements.length;

        for ( ; index < length; index++ ) {
                elem = elements[ index ];
                if ( !elem.style ) {
                        continue;
                }
                values[ index ] = jQuery._data( elem, "olddisplay" );
                if ( show ) {
                        // Reset the inline display of this element to learn if it is
                        // being hidden by cascaded rules or not
                        if ( !values[ index ] && elem.style.display === "none" ) {
                                elem.style.display = "";
                        }

                        // Set elements which have been overridden with display: none
                        // in a stylesheet to whatever the default browser style is
                        // for such an element
                        if ( elem.style.display === "" && isHidden( elem ) ) {
                                values[ index ] = jQuery._data( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
                        }
                } else {
                        display = curCSS( elem, "display" );

                        if ( !values[ index ] && display !== "none" ) {
                                jQuery._data( elem, "olddisplay", display );
                        }
                }
        }

        // Set the display of most of the elements in a second loop
        // to avoid the constant reflow
        for ( index = 0; index < length; index++ ) {
                elem = elements[ index ];
                if ( !elem.style ) {
                        continue;
                }
                if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
                        elem.style.display = show ? values[ index ] || "" : "none";
                }
        }

        return elements;
}

jQuery.fn.extend({
        css: function( name, value ) {
                return jQuery.access( this, function( elem, name, value ) {
                        return value !== undefined ?
                                jQuery.style( elem, name, value ) :
                                jQuery.css( elem, name );
                }, name, value, arguments.length > 1 );
        },
        show: function() {
                return showHide( this, true );
        },
        hide: function() {
                return showHide( this );
        },
        toggle: function( state, fn2 ) {
                var bool = typeof state === "boolean";

                if ( jQuery.isFunction( state ) && jQuery.isFunction( fn2 ) ) {
                        return eventsToggle.apply( this, arguments );
                }

                return this.each(function() {
                        if ( bool ? state : isHidden( this ) ) {
                                jQuery( this ).show();
                        } else {
                                jQuery( this ).hide();
                        }
                });
        }
});

jQuery.extend({
        // Add in style property hooks for overriding the default
        // behavior of getting and setting a style property
        cssHooks: {
                opacity: {
                        get: function( elem, computed ) {
                                if ( computed ) {
                                        // We should always get a number back from opacity
                                        var ret = curCSS( elem, "opacity" );
                                        return ret === "" ? "1" : ret;

                                }
                        }
                }
        },

        // Exclude the following css properties to add px
        cssNumber: {
                "fillOpacity": true,
                "fontWeight": true,
                "lineHeight": true,
                "opacity": true,
                "orphans": true,
                "widows": true,
                "zIndex": true,
                "zoom": true
        },

        // Add in properties whose names you wish to fix before
        // setting or getting the value
        cssProps: {
                // normalize float css property
                "float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
        },

        // Get and set the style property on a DOM Node
        style: function( elem, name, value, extra ) {
                // Don't set styles on text and comment nodes
                if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
                        return;
                }

                // Make sure that we're working with the right name
                var ret, type, hooks,
                        origName = jQuery.camelCase( name ),
                        style = elem.style;

                name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

                // gets hook for the prefixed version
                // followed by the unprefixed version
                hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

                // Check if we're setting a value
                if ( value !== undefined ) {
                        type = typeof value;

                        // convert relative number strings (+= or -=) to relative numbers. #7345
                        if ( type === "string" && (ret = rrelNum.exec( value )) ) {
                                value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
                                // Fixes bug #9237
                                type = "number";
                        }

                        // Make sure that NaN and null values aren't set. See: #7116
                        if ( value == null || type === "number" && isNaN( value ) ) {
                                return;
                        }

                        // If a number was passed in, add 'px' to the (except for certain CSS properties)
                        if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
                                value += "px";
                        }

                        // If a hook was provided, use that value, otherwise just set the specified value
                        if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
                                // Wrapped to prevent IE from throwing errors when 'invalid' values are provided
                                // Fixes bug #5509
                                try {
                                        style[ name ] = value;
                                } catch(e) {}
                        }

                } else {
                        // If a hook was provided get the non-computed value from there
                        if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
                                return ret;
                        }

                        // Otherwise just get the value from the style object
                        return style[ name ];
                }
        },

        css: function( elem, name, numeric, extra ) {
                var val, num, hooks,
                        origName = jQuery.camelCase( name );

                // Make sure that we're working with the right name
                name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

                // gets hook for the prefixed version
                // followed by the unprefixed version
                hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

                // If a hook was provided get the computed value from there
                if ( hooks && "get" in hooks ) {
                        val = hooks.get( elem, true, extra );
                }

                // Otherwise, if a way to get the computed value exists, use that
                if ( val === undefined ) {
                        val = curCSS( elem, name );
                }

                //convert "normal" to computed value
                if ( val === "normal" && name in cssNormalTransform ) {
                        val = cssNormalTransform[ name ];
                }

                // Return, converting to number if forced or a qualifier was provided and val looks numeric
                if ( numeric || extra !== undefined ) {
                        num = parseFloat( val );
                        return numeric || jQuery.isNumeric( num ) ? num || 0 : val;
                }
                return val;
        },

        // A method for quickly swapping in/out CSS properties to get correct calculations
        swap: function( elem, options, callback ) {
                var ret, name,
                        old = {};

                // Remember the old values, and insert the new ones
                for ( name in options ) {
                        old[ name ] = elem.style[ name ];
                        elem.style[ name ] = options[ name ];
                }

                ret = callback.call( elem );

                // Revert the old values
                for ( name in options ) {
                        elem.style[ name ] = old[ name ];
                }

                return ret;
        }
});

// NOTE: To any future maintainer, we've window.getComputedStyle
// because jsdom on node.js will break without it.
if ( window.getComputedStyle ) {
        curCSS = function( elem, name ) {
                var ret, width, minWidth, maxWidth,
                        computed = window.getComputedStyle( elem, null ),
                        style = elem.style;

                if ( computed ) {

                        // getPropertyValue is only needed for .css('filter') in IE9, see #12537
                        ret = computed.getPropertyValue( name ) || computed[ name ];

                        if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
                                ret = jQuery.style( elem, name );
                        }

                        // A tribute to the "awesome hack by Dean Edwards"
                        // Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
                        // Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
                        // this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
                        if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {
                                width = style.width;
                                minWidth = style.minWidth;
                                maxWidth = style.maxWidth;

                                style.minWidth = style.maxWidth = style.width = ret;
                                ret = computed.width;

                                style.width = width;
                                style.minWidth = minWidth;
                                style.maxWidth = maxWidth;
                        }
                }

                return ret;
        };
} else if ( document.documentElement.currentStyle ) {
        curCSS = function( elem, name ) {
                var left, rsLeft,
                        ret = elem.currentStyle && elem.currentStyle[ name ],
                        style = elem.style;

                // Avoid setting ret to empty string here
                // so we don't default to auto
                if ( ret == null && style && style[ name ] ) {
                        ret = style[ name ];
                }

                // From the awesome hack by Dean Edwards
                // http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

                // If we're not dealing with a regular pixel number
                // but a number that has a weird ending, we need to convert it to pixels
                // but not position css attributes, as those are proportional to the parent element instead
                // and we can't measure the parent instead because it might trigger a "stacking dolls" problem
                if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

                        // Remember the original values
                        left = style.left;
                        rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

                        // Put in the new values to get a computed value out
                        if ( rsLeft ) {
                                elem.runtimeStyle.left = elem.currentStyle.left;
                        }
                        style.left = name === "fontSize" ? "1em" : ret;
                        ret = style.pixelLeft + "px";

                        // Revert the changed values
                        style.left = left;
                        if ( rsLeft ) {
                                elem.runtimeStyle.left = rsLeft;
                        }
                }

                return ret === "" ? "auto" : ret;
        };
}

function setPositiveNumber( elem, value, subtract ) {
        var matches = rnumsplit.exec( value );
        return matches ?
                        Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
                        value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox ) {
        var i = extra === ( isBorderBox ? "border" : "content" ) ?
                // If we already have the right measurement, avoid augmentation
                4 :
                // Otherwise initialize for horizontal or vertical properties
                name === "width" ? 1 : 0,

                val = 0;

        for ( ; i < 4; i += 2 ) {
                // both box models exclude margin, so add it if we want it
                if ( extra === "margin" ) {
                        // we use jQuery.css instead of curCSS here
                        // because of the reliableMarginRight CSS hook!
                        val += jQuery.css( elem, extra + cssExpand[ i ], true );
                }

                // From this point on we use curCSS for maximum performance (relevant in animations)
                if ( isBorderBox ) {
                        // border-box includes padding, so remove it if we want content
                        if ( extra === "content" ) {
                                val -= parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;
                        }

                        // at this point, extra isn't border nor margin, so remove border
                        if ( extra !== "margin" ) {
                                val -= parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
                        }
                } else {
                        // at this point, extra isn't content, so add padding
                        val += parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;

                        // at this point, extra isn't content nor padding, so add border
                        if ( extra !== "padding" ) {
                                val += parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
                        }
                }
        }

        return val;
}

function getWidthOrHeight( elem, name, extra ) {

        // Start with offset property, which is equivalent to the border-box value
        var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
                valueIsBorderBox = true,
                isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box";

        // some non-html elements return undefined for offsetWidth, so check for null/undefined
        // svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
        // MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
        if ( val <= 0 || val == null ) {
                // Fall back to computed then uncomputed css if necessary
                val = curCSS( elem, name );
                if ( val < 0 || val == null ) {
                        val = elem.style[ name ];
                }

                // Computed unit is not pixels. Stop here and return.
                if ( rnumnonpx.test(val) ) {
                        return val;
                }

                // we need the check for style in case a browser which returns unreliable values
                // for getComputedStyle silently falls back to the reliable elem.style
                valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

                // Normalize "", auto, and prepare for extra
                val = parseFloat( val ) || 0;
        }

        // use the active box-sizing model to add/subtract irrelevant styles
        return ( val +
                augmentWidthOrHeight(
                        elem,
                        name,
                        extra || ( isBorderBox ? "border" : "content" ),
                        valueIsBorderBox
                )
        ) + "px";
}


// Try to determine the default display value of an element
function css_defaultDisplay( nodeName ) {
        if ( elemdisplay[ nodeName ] ) {
                return elemdisplay[ nodeName ];
        }

        var elem = jQuery( "<" + nodeName + ">" ).appendTo( document.body ),
                display = elem.css("display");
        elem.remove();

        // If the simple way fails,
        // get element's real default display by attaching it to a temp iframe
        if ( display === "none" || display === "" ) {
                // Use the already-created iframe if possible
                iframe = document.body.appendChild(
                        iframe || jQuery.extend( document.createElement("iframe"), {
                                frameBorder: 0,
                                width: 0,
                                height: 0
                        })
                );

                // Create a cacheable copy of the iframe document on first call.
                // IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
                // document to it; WebKit & Firefox won't allow reusing the iframe document.
                if ( !iframeDoc || !iframe.createElement ) {
                        iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
                        iframeDoc.write("<!doctype html><html><body>");
                        iframeDoc.close();
                }

                elem = iframeDoc.body.appendChild( iframeDoc.createElement(nodeName) );

                display = curCSS( elem, "display" );
                document.body.removeChild( iframe );
        }

        // Store the correct default display
        elemdisplay[ nodeName ] = display;

        return display;
}

jQuery.each([ "height", "width" ], function( i, name ) {
        jQuery.cssHooks[ name ] = {
                get: function( elem, computed, extra ) {
                        if ( computed ) {
                                // certain elements can have dimension info if we invisibly show them
                                // however, it must have a current display style that would benefit from this
                                if ( elem.offsetWidth === 0 && rdisplayswap.test( curCSS( elem, "display" ) ) ) {
                                        return jQuery.swap( elem, cssShow, function() {
                                                return getWidthOrHeight( elem, name, extra );
                                        });
                                } else {
                                        return getWidthOrHeight( elem, name, extra );
                                }
                        }
                },

                set: function( elem, value, extra ) {
                        return setPositiveNumber( elem, value, extra ?
                                augmentWidthOrHeight(
                                        elem,
                                        name,
                                        extra,
                                        jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box"
                                ) : 0
                        );
                }
        };
});

if ( !jQuery.support.opacity ) {
        jQuery.cssHooks.opacity = {
                get: function( elem, computed ) {
                        // IE uses filters for opacity
                        return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
                                ( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
                                computed ? "1" : "";
                },

                set: function( elem, value ) {
                        var style = elem.style,
                                currentStyle = elem.currentStyle,
                                opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
                                filter = currentStyle && currentStyle.filter || style.filter || "";

                        // IE has trouble with opacity if it does not have layout
                        // Force it by setting the zoom level
                        style.zoom = 1;

                        // if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
                        if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
                                style.removeAttribute ) {

                                // Setting style.filter to null, "" & " " still leave "filter:" in the cssText
                                // if "filter:" is present at all, clearType is disabled, we want to avoid this
                                // style.removeAttribute is IE Only, but so apparently is this code path...
                                style.removeAttribute( "filter" );

                                // if there there is no filter style applied in a css rule, we are done
                                if ( currentStyle && !currentStyle.filter ) {
                                        return;
                                }
                        }

                        // otherwise, set new filter values
                        style.filter = ralpha.test( filter ) ?
                                filter.replace( ralpha, opacity ) :
                                filter + " " + opacity;
                }
        };
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
jQuery(function() {
        if ( !jQuery.support.reliableMarginRight ) {
                jQuery.cssHooks.marginRight = {
                        get: function( elem, computed ) {
                                // WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
                                // Work around by temporarily setting element display to inline-block
                                return jQuery.swap( elem, { "display": "inline-block" }, function() {
                                        if ( computed ) {
                                                return curCSS( elem, "marginRight" );
                                        }
                                });
                        }
                };
        }

        // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
        // getComputedStyle returns percent when specified for top/left/bottom/right
        // rather than make the css module depend on the offset module, we just check for it here
        if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
                jQuery.each( [ "top", "left" ], function( i, prop ) {
                        jQuery.cssHooks[ prop ] = {
                                get: function( elem, computed ) {
                                        if ( computed ) {
                                                var ret = curCSS( elem, prop );
                                                // if curCSS returns percentage, fallback to offset
                                                return rnumnonpx.test( ret ) ? jQuery( elem ).position()[ prop ] + "px" : ret;
                                        }
                                }
                        };
                });
        }

});

if ( jQuery.expr && jQuery.expr.filters ) {
        jQuery.expr.filters.hidden = function( elem ) {
                return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || curCSS( elem, "display" )) === "none");
        };

        jQuery.expr.filters.visible = function( elem ) {
                return !jQuery.expr.filters.hidden( elem );
        };
}

// These hooks are used by animate to expand properties
jQuery.each({
        margin: "",
        padding: "",
        border: "Width"
}, function( prefix, suffix ) {
        jQuery.cssHooks[ prefix + suffix ] = {
                expand: function( value ) {
                        var i,

                                // assumes a single number if not a string
                                parts = typeof value === "string" ? value.split(" ") : [ value ],
                                expanded = {};

                        for ( i = 0; i < 4; i++ ) {
                                expanded[ prefix + cssExpand[ i ] + suffix ] =
                                        parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
                        }

                        return expanded;
                }
        };

        if ( !rmargin.test( prefix ) ) {
                jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
        }
});
var r20 = /%20/g,
        rbracket = /\[\]$/,
        rCRLF = /\r?\n/g,
        rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
        rselectTextarea = /^(?:select|textarea)/i;

jQuery.fn.extend({
        serialize: function() {
                return jQuery.param( this.serializeArray() );
        },
        serializeArray: function() {
                return this.map(function(){
                        return this.elements ? jQuery.makeArray( this.elements ) : this;
                })
                .filter(function(){
                        return this.name && !this.disabled &&
                                ( this.checked || rselectTextarea.test( this.nodeName ) ||
                                        rinput.test( this.type ) );
                })
                .map(function( i, elem ){
                        var val = jQuery( this ).val();

                        return val == null ?
                                null :
                                jQuery.isArray( val ) ?
                                        jQuery.map( val, function( val, i ){
                                                return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
                                        }) :
                                        { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
                }).get();
        }
});

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
        var prefix,
                s = [],
                add = function( key, value ) {
                        // If value is a function, invoke it and return its value
                        value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
                        s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
                };

        // Set traditional to true for jQuery <= 1.3.2 behavior.
        if ( traditional === undefined ) {
                traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
        }

        // If an array was passed in, assume that it is an array of form elements.
        if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
                // Serialize the form elements
                jQuery.each( a, function() {
                        add( this.name, this.value );
                });

        } else {
                // If traditional, encode the "old" way (the way 1.3.2 or older
                // did it), otherwise encode params recursively.
                for ( prefix in a ) {
                        buildParams( prefix, a[ prefix ], traditional, add );
                }
        }

        // Return the resulting serialization
        return s.join( "&" ).replace( r20, "+" );
};

function buildParams( prefix, obj, traditional, add ) {
        var name;

        if ( jQuery.isArray( obj ) ) {
                // Serialize array item.
                jQuery.each( obj, function( i, v ) {
                        if ( traditional || rbracket.test( prefix ) ) {
                                // Treat each array item as a scalar.
                                add( prefix, v );

                        } else {
                                // If array item is non-scalar (array or object), encode its
                                // numeric index to resolve deserialization ambiguity issues.
                                // Note that rack (as of 1.0.0) can't currently deserialize
                                // nested arrays properly, and attempting to do so may cause
                                // a server error. Possible fixes are to modify rack's
                                // deserialization algorithm or to provide an option or flag
                                // to force array serialization to be shallow.
                                buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
                        }
                });

        } else if ( !traditional && jQuery.type( obj ) === "object" ) {
                // Serialize object item.
                for ( name in obj ) {
                        buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
                }

        } else {
                // Serialize scalar item.
                add( prefix, obj );
        }
}
var
        // Document location
        ajaxLocParts,
        ajaxLocation,

        rhash = /#.*$/,
        rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
        // #7653, #8125, #8152: local protocol detection
        rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
        rnoContent = /^(?:GET|HEAD)$/,
        rprotocol = /^\/\//,
        rquery = /\?/,
        rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        rts = /([?&])_=[^&]*/,
        rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

        // Keep a copy of the old load method
        _load = jQuery.fn.load,

        /* Prefilters
         * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
         * 2) These are called:
         *    - BEFORE asking for a transport
         *    - AFTER param serialization (s.data is a string if s.processData is true)
         * 3) key is the dataType
         * 4) the catchall symbol "*" can be used
         * 5) execution will start with transport dataType and THEN continue down to "*" if needed
         */
        prefilters = {},

        /* Transports bindings
         * 1) key is the dataType
         * 2) the catchall symbol "*" can be used
         * 3) selection will start with transport dataType and THEN go to "*" if needed
         */
        transports = {},

        // Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
        allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
        ajaxLocation = location.href;
} catch( e ) {
        // Use the href attribute of an A element
        // since IE will modify it given document.location
        ajaxLocation = document.createElement( "a" );
        ajaxLocation.href = "";
        ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

        // dataTypeExpression is optional and defaults to "*"
        return function( dataTypeExpression, func ) {

                if ( typeof dataTypeExpression !== "string" ) {
                        func = dataTypeExpression;
                        dataTypeExpression = "*";
                }

                var dataType, list, placeBefore,
                        dataTypes = dataTypeExpression.toLowerCase().split( core_rspace ),
                        i = 0,
                        length = dataTypes.length;

                if ( jQuery.isFunction( func ) ) {
                        // For each dataType in the dataTypeExpression
                        for ( ; i < length; i++ ) {
                                dataType = dataTypes[ i ];
                                // We control if we're asked to add before
                                // any existing element
                                placeBefore = /^\+/.test( dataType );
                                if ( placeBefore ) {
                                        dataType = dataType.substr( 1 ) || "*";
                                }
                                list = structure[ dataType ] = structure[ dataType ] || [];
                                // then we add to the structure accordingly
                                list[ placeBefore ? "unshift" : "push" ]( func );
                        }
                }
        };
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
                dataType /* internal */, inspected /* internal */ ) {

        dataType = dataType || options.dataTypes[ 0 ];
        inspected = inspected || {};

        inspected[ dataType ] = true;

        var selection,
                list = structure[ dataType ],
                i = 0,
                length = list ? list.length : 0,
                executeOnly = ( structure === prefilters );

        for ( ; i < length && ( executeOnly || !selection ); i++ ) {
                selection = list[ i ]( options, originalOptions, jqXHR );
                // If we got redirected to another dataType
                // we try there if executing only and not done already
                if ( typeof selection === "string" ) {
                        if ( !executeOnly || inspected[ selection ] ) {
                                selection = undefined;
                        } else {
                                options.dataTypes.unshift( selection );
                                selection = inspectPrefiltersOrTransports(
                                                structure, options, originalOptions, jqXHR, selection, inspected );
                        }
                }
        }
        // If we're only executing or nothing was selected
        // we try the catchall dataType if not done already
        if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
                selection = inspectPrefiltersOrTransports(
                                structure, options, originalOptions, jqXHR, "*", inspected );
        }
        // unnecessary when only executing (prefilters)
        // but it'll be ignored by the caller in that case
        return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
        var key, deep,
                flatOptions = jQuery.ajaxSettings.flatOptions || {};
        for ( key in src ) {
                if ( src[ key ] !== undefined ) {
                        ( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
                }
        }
        if ( deep ) {
                jQuery.extend( true, target, deep );
        }
}

jQuery.fn.load = function( url, params, callback ) {
        if ( typeof url !== "string" && _load ) {
                return _load.apply( this, arguments );
        }

        // Don't do a request if no elements are being requested
        if ( !this.length ) {
                return this;
        }

        var selector, type, response,
                self = this,
                off = url.indexOf(" ");

        if ( off >= 0 ) {
                selector = url.slice( off, url.length );
                url = url.slice( 0, off );
        }

        // If it's a function
        if ( jQuery.isFunction( params ) ) {

                // We assume that it's the callback
                callback = params;
                params = undefined;

        // Otherwise, build a param string
        } else if ( params && typeof params === "object" ) {
                type = "POST";
        }

        // Request the remote document
        jQuery.ajax({
                url: url,

                // if "type" variable is undefined, then "GET" method will be used
                type: type,
                dataType: "html",
                data: params,
                complete: function( jqXHR, status ) {
                        if ( callback ) {
                                self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
                        }
                }
        }).done(function( responseText ) {

                // Save response for use in complete callback
                response = arguments;

                // See if a selector was specified
                self.html( selector ?

                        // Create a dummy div to hold the results
                        jQuery("<div>")

                                // inject the contents of the document in, removing the scripts
                                // to avoid any 'Permission Denied' errors in IE
                                .append( responseText.replace( rscript, "" ) )

                                // Locate the specified elements
                                .find( selector ) :

                        // If not, just inject the full result
                        responseText );

        });

        return this;
};

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
        jQuery.fn[ o ] = function( f ){
                return this.on( o, f );
        };
});

jQuery.each( [ "get", "post" ], function( i, method ) {
        jQuery[ method ] = function( url, data, callback, type ) {
                // shift arguments if data argument was omitted
                if ( jQuery.isFunction( data ) ) {
                        type = type || callback;
                        callback = data;
                        data = undefined;
                }

                return jQuery.ajax({
                        type: method,
                        url: url,
                        data: data,
                        success: callback,
                        dataType: type
                });
        };
});

jQuery.extend({

        getScript: function( url, callback ) {
                return jQuery.get( url, undefined, callback, "script" );
        },

        getJSON: function( url, data, callback ) {
                return jQuery.get( url, data, callback, "json" );
        },

        // Creates a full fledged settings object into target
        // with both ajaxSettings and settings fields.
        // If target is omitted, writes into ajaxSettings.
        ajaxSetup: function( target, settings ) {
                if ( settings ) {
                        // Building a settings object
                        ajaxExtend( target, jQuery.ajaxSettings );
                } else {
                        // Extending ajaxSettings
                        settings = target;
                        target = jQuery.ajaxSettings;
                }
                ajaxExtend( target, settings );
                return target;
        },

        ajaxSettings: {
                url: ajaxLocation,
                isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
                global: true,
                type: "GET",
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                processData: true,
                async: true,
                /*
                timeout: 0,
                data: null,
                dataType: null,
                username: null,
                password: null,
                cache: null,
                throws: false,
                traditional: false,
                headers: {},
                */

                accepts: {
                        xml: "application/xml, text/xml",
                        html: "text/html",
                        text: "text/plain",
                        json: "application/json, text/javascript",
                        "*": allTypes
                },

                contents: {
                        xml: /xml/,
                        html: /html/,
                        json: /json/
                },

                responseFields: {
                        xml: "responseXML",
                        text: "responseText"
                },

                // List of data converters
                // 1) key format is "source_type destination_type" (a single space in-between)
                // 2) the catchall symbol "*" can be used for source_type
                converters: {

                        // Convert anything to text
                        "* text": window.String,

                        // Text to html (true = no transformation)
                        "text html": true,

                        // Evaluate text as a json expression
                        "text json": jQuery.parseJSON,

                        // Parse text as xml
                        "text xml": jQuery.parseXML
                },

                // For options that shouldn't be deep extended:
                // you can add your own custom options here if
                // and when you create one that shouldn't be
                // deep extended (see ajaxExtend)
                flatOptions: {
                        context: true,
                        url: true
                }
        },

        ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
        ajaxTransport: addToPrefiltersOrTransports( transports ),

        // Main method
        ajax: function( url, options ) {

                // If url is an object, simulate pre-1.5 signature
                if ( typeof url === "object" ) {
                        options = url;
                        url = undefined;
                }

                // Force options to be an object
                options = options || {};

                var // ifModified key
                        ifModifiedKey,
                        // Response headers
                        responseHeadersString,
                        responseHeaders,
                        // transport
                        transport,
                        // timeout handle
                        timeoutTimer,
                        // Cross-domain detection vars
                        parts,
                        // To know if global events are to be dispatched
                        fireGlobals,
                        // Loop variable
                        i,
                        // Create the final options object
                        s = jQuery.ajaxSetup( {}, options ),
                        // Callbacks context
                        callbackContext = s.context || s,
                        // Context for global events
                        // It's the callbackContext if one was provided in the options
                        // and if it's a DOM node or a jQuery collection
                        globalEventContext = callbackContext !== s &&
                                ( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
                                                jQuery( callbackContext ) : jQuery.event,
                        // Deferreds
                        deferred = jQuery.Deferred(),
                        completeDeferred = jQuery.Callbacks( "once memory" ),
                        // Status-dependent callbacks
                        statusCode = s.statusCode || {},
                        // Headers (they are sent all at once)
                        requestHeaders = {},
                        requestHeadersNames = {},
                        // The jqXHR state
                        state = 0,
                        // Default abort message
                        strAbort = "canceled",
                        // Fake xhr
                        jqXHR = {

                                readyState: 0,

                                // Caches the header
                                setRequestHeader: function( name, value ) {
                                        if ( !state ) {
                                                var lname = name.toLowerCase();
                                                name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
                                                requestHeaders[ name ] = value;
                                        }
                                        return this;
                                },

                                // Raw string
                                getAllResponseHeaders: function() {
                                        return state === 2 ? responseHeadersString : null;
                                },

                                // Builds headers hashtable if needed
                                getResponseHeader: function( key ) {
                                        var match;
                                        if ( state === 2 ) {
                                                if ( !responseHeaders ) {
                                                        responseHeaders = {};
                                                        while( ( match = rheaders.exec( responseHeadersString ) ) ) {
                                                                responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
                                                        }
                                                }
                                                match = responseHeaders[ key.toLowerCase() ];
                                        }
                                        return match === undefined ? null : match;
                                },

                                // Overrides response content-type header
                                overrideMimeType: function( type ) {
                                        if ( !state ) {
                                                s.mimeType = type;
                                        }
                                        return this;
                                },

                                // Cancel the request
                                abort: function( statusText ) {
                                        statusText = statusText || strAbort;
                                        if ( transport ) {
                                                transport.abort( statusText );
                                        }
                                        done( 0, statusText );
                                        return this;
                                }
                        };

                // Callback for when everything is done
                // It is defined here because jslint complains if it is declared
                // at the end of the function (which would be more logical and readable)
                function done( status, nativeStatusText, responses, headers ) {
                        var isSuccess, success, error, response, modified,
                                statusText = nativeStatusText;

                        // Called once
                        if ( state === 2 ) {
                                return;
                        }

                        // State is "done" now
                        state = 2;

                        // Clear timeout if it exists
                        if ( timeoutTimer ) {
                                clearTimeout( timeoutTimer );
                        }

                        // Dereference transport for early garbage collection
                        // (no matter how long the jqXHR object will be used)
                        transport = undefined;

                        // Cache response headers
                        responseHeadersString = headers || "";

                        // Set readyState
                        jqXHR.readyState = status > 0 ? 4 : 0;

                        // Get response data
                        if ( responses ) {
                                response = ajaxHandleResponses( s, jqXHR, responses );
                        }

                        // If successful, handle type chaining
                        if ( status >= 200 && status < 300 || status === 304 ) {

                                // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
                                if ( s.ifModified ) {

                                        modified = jqXHR.getResponseHeader("Last-Modified");
                                        if ( modified ) {
                                                jQuery.lastModified[ ifModifiedKey ] = modified;
                                        }
                                        modified = jqXHR.getResponseHeader("Etag");
                                        if ( modified ) {
                                                jQuery.etag[ ifModifiedKey ] = modified;
                                        }
                                }

                                // If not modified
                                if ( status === 304 ) {

                                        statusText = "notmodified";
                                        isSuccess = true;

                                // If we have data
                                } else {

                                        isSuccess = ajaxConvert( s, response );
                                        statusText = isSuccess.state;
                                        success = isSuccess.data;
                                        error = isSuccess.error;
                                        isSuccess = !error;
                                }
                        } else {
                                // We extract error from statusText
                                // then normalize statusText and status for non-aborts
                                error = statusText;
                                if ( !statusText || status ) {
                                        statusText = "error";
                                        if ( status < 0 ) {
                                                status = 0;
                                        }
                                }
                        }

                        // Set data for the fake xhr object
                        jqXHR.status = status;
                        jqXHR.statusText = ( nativeStatusText || statusText ) + "";

                        // Success/Error
                        if ( isSuccess ) {
                                deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
                        } else {
                                deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
                        }

                        // Status-dependent callbacks
                        jqXHR.statusCode( statusCode );
                        statusCode = undefined;

                        if ( fireGlobals ) {
                                globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
                                                [ jqXHR, s, isSuccess ? success : error ] );
                        }

                        // Complete
                        completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

                        if ( fireGlobals ) {
                                globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
                                // Handle the global AJAX counter
                                if ( !( --jQuery.active ) ) {
                                        jQuery.event.trigger( "ajaxStop" );
                                }
                        }
                }

                // Attach deferreds
                deferred.promise( jqXHR );
                jqXHR.success = jqXHR.done;
                jqXHR.error = jqXHR.fail;
                jqXHR.complete = completeDeferred.add;

                // Status-dependent callbacks
                jqXHR.statusCode = function( map ) {
                        if ( map ) {
                                var tmp;
                                if ( state < 2 ) {
                                        for ( tmp in map ) {
                                                statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
                                        }
                                } else {
                                        tmp = map[ jqXHR.status ];
                                        jqXHR.always( tmp );
                                }
                        }
                        return this;
                };

                // Remove hash character (#7531: and string promotion)
                // Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
                // We also use the url parameter if available
                s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

                // Extract dataTypes list
                s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( core_rspace );

                // A cross-domain request is in order when we have a protocol:host:port mismatch
                if ( s.crossDomain == null ) {
                        parts = rurl.exec( s.url.toLowerCase() );
                        s.crossDomain = !!( parts &&
                                ( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
                                        ( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
                                                ( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
                        );
                }

                // Convert data if not already a string
                if ( s.data && s.processData && typeof s.data !== "string" ) {
                        s.data = jQuery.param( s.data, s.traditional );
                }

                // Apply prefilters
                inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

                // If request was aborted inside a prefilter, stop there
                if ( state === 2 ) {
                        return jqXHR;
                }

                // We can fire global events as of now if asked to
                fireGlobals = s.global;

                // Uppercase the type
                s.type = s.type.toUpperCase();

                // Determine if request has content
                s.hasContent = !rnoContent.test( s.type );

                // Watch for a new set of requests
                if ( fireGlobals && jQuery.active++ === 0 ) {
                        jQuery.event.trigger( "ajaxStart" );
                }

                // More options handling for requests with no content
                if ( !s.hasContent ) {

                        // If data is available, append data to url
                        if ( s.data ) {
                                s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
                                // #9682: remove data so that it's not used in an eventual retry
                                delete s.data;
                        }

                        // Get ifModifiedKey before adding the anti-cache parameter
                        ifModifiedKey = s.url;

                        // Add anti-cache in url if needed
                        if ( s.cache === false ) {

                                var ts = jQuery.now(),
                                        // try replacing _= if it is there
                                        ret = s.url.replace( rts, "$1_=" + ts );

                                // if nothing was replaced, add timestamp to the end
                                s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
                        }
                }

                // Set the correct header, if data is being sent
                if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
                        jqXHR.setRequestHeader( "Content-Type", s.contentType );
                }

                // Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
                if ( s.ifModified ) {
                        ifModifiedKey = ifModifiedKey || s.url;
                        if ( jQuery.lastModified[ ifModifiedKey ] ) {
                                jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
                        }
                        if ( jQuery.etag[ ifModifiedKey ] ) {
                                jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
                        }
                }

                // Set the Accepts header for the server, depending on the dataType
                jqXHR.setRequestHeader(
                        "Accept",
                        s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
                                s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
                                s.accepts[ "*" ]
                );

                // Check for headers option
                for ( i in s.headers ) {
                        jqXHR.setRequestHeader( i, s.headers[ i ] );
                }

                // Allow custom headers/mimetypes and early abort
                if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
                                // Abort if not done already and return
                                return jqXHR.abort();

                }

                // aborting is no longer a cancellation
                strAbort = "abort";

                // Install callbacks on deferreds
                for ( i in { success: 1, error: 1, complete: 1 } ) {
                        jqXHR[ i ]( s[ i ] );
                }

                // Get transport
                transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

                // If no transport, we auto-abort
                if ( !transport ) {
                        done( -1, "No Transport" );
                } else {
                        jqXHR.readyState = 1;
                        // Send global event
                        if ( fireGlobals ) {
                                globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
                        }
                        // Timeout
                        if ( s.async && s.timeout > 0 ) {
                                timeoutTimer = setTimeout( function(){
                                        jqXHR.abort( "timeout" );
                                }, s.timeout );
                        }

                        try {
                                state = 1;
                                transport.send( requestHeaders, done );
                        } catch (e) {
                                // Propagate exception as error if not done
                                if ( state < 2 ) {
                                        done( -1, e );
                                // Simply rethrow otherwise
                                } else {
                                        throw e;
                                }
                        }
                }

                return jqXHR;
        },

        // Counter for holding the number of active queries
        active: 0,

        // Last-Modified header cache for next request
        lastModified: {},
        etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

        var ct, type, finalDataType, firstDataType,
                contents = s.contents,
                dataTypes = s.dataTypes,
                responseFields = s.responseFields;

        // Fill responseXXX fields
        for ( type in responseFields ) {
                if ( type in responses ) {
                        jqXHR[ responseFields[type] ] = responses[ type ];
                }
        }

        // Remove auto dataType and get content-type in the process
        while( dataTypes[ 0 ] === "*" ) {
                dataTypes.shift();
                if ( ct === undefined ) {
                        ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
                }
        }

        // Check if we're dealing with a known content-type
        if ( ct ) {
                for ( type in contents ) {
                        if ( contents[ type ] && contents[ type ].test( ct ) ) {
                                dataTypes.unshift( type );
                                break;
                        }
                }
        }

        // Check to see if we have a response for the expected dataType
        if ( dataTypes[ 0 ] in responses ) {
                finalDataType = dataTypes[ 0 ];
        } else {
                // Try convertible dataTypes
                for ( type in responses ) {
                        if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
                                finalDataType = type;
                                break;
                        }
                        if ( !firstDataType ) {
                                firstDataType = type;
                        }
                }
                // Or just use first one
                finalDataType = finalDataType || firstDataType;
        }

        // If we found a dataType
        // We add the dataType to the list if needed
        // and return the corresponding response
        if ( finalDataType ) {
                if ( finalDataType !== dataTypes[ 0 ] ) {
                        dataTypes.unshift( finalDataType );
                }
                return responses[ finalDataType ];
        }
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

        var conv, conv2, current, tmp,
                // Work with a copy of dataTypes in case we need to modify it for conversion
                dataTypes = s.dataTypes.slice(),
                prev = dataTypes[ 0 ],
                converters = {},
                i = 0;

        // Apply the dataFilter if provided
        if ( s.dataFilter ) {
                response = s.dataFilter( response, s.dataType );
        }

        // Create converters map with lowercased keys
        if ( dataTypes[ 1 ] ) {
                for ( conv in s.converters ) {
                        converters[ conv.toLowerCase() ] = s.converters[ conv ];
                }
        }

        // Convert to each sequential dataType, tolerating list modification
        for ( ; (current = dataTypes[++i]); ) {

                // There's only work to do if current dataType is non-auto
                if ( current !== "*" ) {

                        // Convert response if prev dataType is non-auto and differs from current
                        if ( prev !== "*" && prev !== current ) {

                                // Seek a direct converter
                                conv = converters[ prev + " " + current ] || converters[ "* " + current ];

                                // If none found, seek a pair
                                if ( !conv ) {
                                        for ( conv2 in converters ) {

                                                // If conv2 outputs current
                                                tmp = conv2.split(" ");
                                                if ( tmp[ 1 ] === current ) {

                                                        // If prev can be converted to accepted input
                                                        conv = converters[ prev + " " + tmp[ 0 ] ] ||
                                                                converters[ "* " + tmp[ 0 ] ];
                                                        if ( conv ) {
                                                                // Condense equivalence converters
                                                                if ( conv === true ) {
                                                                        conv = converters[ conv2 ];

                                                                // Otherwise, insert the intermediate dataType
                                                                } else if ( converters[ conv2 ] !== true ) {
                                                                        current = tmp[ 0 ];
                                                                        dataTypes.splice( i--, 0, current );
                                                                }

                                                                break;
                                                        }
                                                }
                                        }
                                }

                                // Apply converter (if not an equivalence)
                                if ( conv !== true ) {

                                        // Unless errors are allowed to bubble, catch and return them
                                        if ( conv && s["throws"] ) {
                                                response = conv( response );
                                        } else {
                                                try {
                                                        response = conv( response );
                                                } catch ( e ) {
                                                        return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
                                                }
                                        }
                                }
                        }

                        // Update prev for next iteration
                        prev = current;
                }
        }

        return { state: "success", data: response };
}
var oldCallbacks = [],
        rquestion = /\?/,
        rjsonp = /(=)\?(?=&|$)|\?\?/,
        nonce = jQuery.now();

// Default jsonp settings
jQuery.ajaxSetup({
        jsonp: "callback",
        jsonpCallback: function() {
                var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
                this[ callback ] = true;
                return callback;
        }
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

        var callbackName, overwritten, responseContainer,
                data = s.data,
                url = s.url,
                hasCallback = s.jsonp !== false,
                replaceInUrl = hasCallback && rjsonp.test( url ),
                replaceInData = hasCallback && !replaceInUrl && typeof data === "string" &&
                        !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") &&
                        rjsonp.test( data );

        // Handle iff the expected data type is "jsonp" or we have a parameter to set
        if ( s.dataTypes[ 0 ] === "jsonp" || replaceInUrl || replaceInData ) {

                // Get callback name, remembering preexisting value associated with it
                callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
                        s.jsonpCallback() :
                        s.jsonpCallback;
                overwritten = window[ callbackName ];

                // Insert callback into url or form data
                if ( replaceInUrl ) {
                        s.url = url.replace( rjsonp, "$1" + callbackName );
                } else if ( replaceInData ) {
                        s.data = data.replace( rjsonp, "$1" + callbackName );
                } else if ( hasCallback ) {
                        s.url += ( rquestion.test( url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
                }

                // Use data converter to retrieve json after script execution
                s.converters["script json"] = function() {
                        if ( !responseContainer ) {
                                jQuery.error( callbackName + " was not called" );
                        }
                        return responseContainer[ 0 ];
                };

                // force json dataType
                s.dataTypes[ 0 ] = "json";

                // Install callback
                window[ callbackName ] = function() {
                        responseContainer = arguments;
                };

                // Clean-up function (fires after converters)
                jqXHR.always(function() {
                        // Restore preexisting value
                        window[ callbackName ] = overwritten;

                        // Save back as free
                        if ( s[ callbackName ] ) {
                                // make sure that re-using the options doesn't screw things around
                                s.jsonpCallback = originalSettings.jsonpCallback;

                                // save the callback name for future use
                                oldCallbacks.push( callbackName );
                        }

                        // Call if it was a function and we have a response
                        if ( responseContainer && jQuery.isFunction( overwritten ) ) {
                                overwritten( responseContainer[ 0 ] );
                        }

                        responseContainer = overwritten = undefined;
                });

                // Delegate to script
                return "script";
        }
});
// Install script dataType
jQuery.ajaxSetup({
        accepts: {
                script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
        },
        contents: {
                script: /javascript|ecmascript/
        },
        converters: {
                "text script": function( text ) {
                        jQuery.globalEval( text );
                        return text;
                }
        }
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
        if ( s.cache === undefined ) {
                s.cache = false;
        }
        if ( s.crossDomain ) {
                s.type = "GET";
                s.global = false;
        }
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

        // This transport only deals with cross domain requests
        if ( s.crossDomain ) {

                var script,
                        head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

                return {

                        send: function( _, callback ) {

                                script = document.createElement( "script" );

                                script.async = "async";

                                if ( s.scriptCharset ) {
                                        script.charset = s.scriptCharset;
                                }

                                script.src = s.url;

                                // Attach handlers for all browsers
                                script.onload = script.onreadystatechange = function( _, isAbort ) {

                                        if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

                                                // Handle memory leak in IE
                                                script.onload = script.onreadystatechange = null;

                                                // Remove the script
                                                if ( head && script.parentNode ) {
                                                        head.removeChild( script );
                                                }

                                                // Dereference the script
                                                script = undefined;

                                                // Callback if not abort
                                                if ( !isAbort ) {
                                                        callback( 200, "success" );
                                                }
                                        }
                                };
                                // Use insertBefore instead of appendChild  to circumvent an IE6 bug.
                                // This arises when a base node is used (#2709 and #4378).
                                head.insertBefore( script, head.firstChild );
                        },

                        abort: function() {
                                if ( script ) {
                                        script.onload( 0, 1 );
                                }
                        }
                };
        }
});
var xhrCallbacks,
        // #5280: Internet Explorer will keep connections alive if we don't abort on unload
        xhrOnUnloadAbort = window.ActiveXObject ? function() {
                // Abort all pending requests
                for ( var key in xhrCallbacks ) {
                        xhrCallbacks[ key ]( 0, 1 );
                }
        } : false,
        xhrId = 0;

// Functions to create xhrs
function createStandardXHR() {
        try {
                return new window.XMLHttpRequest();
        } catch( e ) {}
}

function createActiveXHR() {
        try {
                return new window.ActiveXObject( "Microsoft.XMLHTTP" );
        } catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
        /* Microsoft failed to properly
         * implement the XMLHttpRequest in IE7 (can't request local files),
         * so we use the ActiveXObject when it is available
         * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
         * we need a fallback.
         */
        function() {
                return !this.isLocal && createStandardXHR() || createActiveXHR();
        } :
        // For all other browsers, use the standard XMLHttpRequest object
        createStandardXHR;

// Determine support properties
(function( xhr ) {
        jQuery.extend( jQuery.support, {
                ajax: !!xhr,
                cors: !!xhr && ( "withCredentials" in xhr )
        });
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

        jQuery.ajaxTransport(function( s ) {
                // Cross domain only allowed if supported through XMLHttpRequest
                if ( !s.crossDomain || jQuery.support.cors ) {

                        var callback;

                        return {
                                send: function( headers, complete ) {

                                        // Get a new xhr
                                        var handle, i,
                                                xhr = s.xhr();

                                        // Open the socket
                                        // Passing null username, generates a login popup on Opera (#2865)
                                        if ( s.username ) {
                                                xhr.open( s.type, s.url, s.async, s.username, s.password );
                                        } else {
                                                xhr.open( s.type, s.url, s.async );
                                        }

                                        // Apply custom fields if provided
                                        if ( s.xhrFields ) {
                                                for ( i in s.xhrFields ) {
                                                        xhr[ i ] = s.xhrFields[ i ];
                                                }
                                        }

                                        // Override mime type if needed
                                        if ( s.mimeType && xhr.overrideMimeType ) {
                                                xhr.overrideMimeType( s.mimeType );
                                        }

                                        // X-Requested-With header
                                        // For cross-domain requests, seeing as conditions for a preflight are
                                        // akin to a jigsaw puzzle, we simply never set it to be sure.
                                        // (it can always be set on a per-request basis or even using ajaxSetup)
                                        // For same-domain requests, won't change header if already provided.
                                        if ( !s.crossDomain && !headers["X-Requested-With"] ) {
                                                headers[ "X-Requested-With" ] = "XMLHttpRequest";
                                        }

                                        // Need an extra try/catch for cross domain requests in Firefox 3
                                        try {
                                                for ( i in headers ) {
                                                        xhr.setRequestHeader( i, headers[ i ] );
                                                }
                                        } catch( _ ) {}

                                        // Do send the request
                                        // This may raise an exception which is actually
                                        // handled in jQuery.ajax (so no try/catch here)
                                        xhr.send( ( s.hasContent && s.data ) || null );

                                        // Listener
                                        callback = function( _, isAbort ) {

                                                var status,
                                                        statusText,
                                                        responseHeaders,
                                                        responses,
                                                        xml;

                                                // Firefox throws exceptions when accessing properties
                                                // of an xhr when a network error occurred
                                                // http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
                                                try {

                                                        // Was never called and is aborted or complete
                                                        if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

                                                                // Only called once
                                                                callback = undefined;

                                                                // Do not keep as active anymore
                                                                if ( handle ) {
                                                                        xhr.onreadystatechange = jQuery.noop;
                                                                        if ( xhrOnUnloadAbort ) {
                                                                                delete xhrCallbacks[ handle ];
                                                                        }
                                                                }

                                                                // If it's an abort
                                                                if ( isAbort ) {
                                                                        // Abort it manually if needed
                                                                        if ( xhr.readyState !== 4 ) {
                                                                                xhr.abort();
                                                                        }
                                                                } else {
                                                                        status = xhr.status;
                                                                        responseHeaders = xhr.getAllResponseHeaders();
                                                                        responses = {};
                                                                        xml = xhr.responseXML;

                                                                        // Construct response list
                                                                        if ( xml && xml.documentElement /* #4958 */ ) {
                                                                                responses.xml = xml;
                                                                        }

                                                                        // When requesting binary data, IE6-9 will throw an exception
                                                                        // on any attempt to access responseText (#11426)
                                                                        try {
                                                                                responses.text = xhr.responseText;
                                                                        } catch( e ) {
                                                                        }

                                                                        // Firefox throws an exception when accessing
                                                                        // statusText for faulty cross-domain requests
                                                                        try {
                                                                                statusText = xhr.statusText;
                                                                        } catch( e ) {
                                                                                // We normalize with Webkit giving an empty statusText
                                                                                statusText = "";
                                                                        }

                                                                        // Filter status for non standard behaviors

                                                                        // If the request is local and we have data: assume a success
                                                                        // (success with no data won't get notified, that's the best we
                                                                        // can do given current implementations)
                                                                        if ( !status && s.isLocal && !s.crossDomain ) {
                                                                                status = responses.text ? 200 : 404;
                                                                        // IE - #1450: sometimes returns 1223 when it should be 204
                                                                        } else if ( status === 1223 ) {
                                                                                status = 204;
                                                                        }
                                                                }
                                                        }
                                                } catch( firefoxAccessException ) {
                                                        if ( !isAbort ) {
                                                                complete( -1, firefoxAccessException );
                                                        }
                                                }

                                                // Call complete if needed
                                                if ( responses ) {
                                                        complete( status, statusText, responses, responseHeaders );
                                                }
                                        };

                                        if ( !s.async ) {
                                                // if we're in sync mode we fire the callback
                                                callback();
                                        } else if ( xhr.readyState === 4 ) {
                                                // (IE6 & IE7) if it's in cache and has been
                                                // retrieved directly we need to fire the callback
                                                setTimeout( callback, 0 );
                                        } else {
                                                handle = ++xhrId;
                                                if ( xhrOnUnloadAbort ) {
                                                        // Create the active xhrs callbacks list if needed
                                                        // and attach the unload handler
                                                        if ( !xhrCallbacks ) {
                                                                xhrCallbacks = {};
                                                                jQuery( window ).unload( xhrOnUnloadAbort );
                                                        }
                                                        // Add to list of active xhrs callbacks
                                                        xhrCallbacks[ handle ] = callback;
                                                }
                                                xhr.onreadystatechange = callback;
                                        }
                                },

                                abort: function() {
                                        if ( callback ) {
                                                callback(0,1);
                                        }
                                }
                        };
                }
        });
}
var fxNow, timerId,
        rfxtypes = /^(?:toggle|show|hide)$/,
        rfxnum = new RegExp( "^(?:([-+])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
        rrun = /queueHooks$/,
        animationPrefilters = [ defaultPrefilter ],
        tweeners = {
                "*": [function( prop, value ) {
                        var end, unit,
                                tween = this.createTween( prop, value ),
                                parts = rfxnum.exec( value ),
                                target = tween.cur(),
                                start = +target || 0,
                                scale = 1,
                                maxIterations = 20;

                        if ( parts ) {
                                end = +parts[2];
                                unit = parts[3] || ( jQuery.cssNumber[ prop ] ? "" : "px" );

                                // We need to compute starting value
                                if ( unit !== "px" && start ) {
                                        // Iteratively approximate from a nonzero starting point
                                        // Prefer the current property, because this process will be trivial if it uses the same units
                                        // Fallback to end or a simple constant
                                        start = jQuery.css( tween.elem, prop, true ) || end || 1;

                                        do {
                                                // If previous iteration zeroed out, double until we get *something*
                                                // Use a string for doubling factor so we don't accidentally see scale as unchanged below
                                                scale = scale || ".5";

                                                // Adjust and apply
                                                start = start / scale;
                                                jQuery.style( tween.elem, prop, start + unit );

                                        // Update scale, tolerating zero or NaN from tween.cur()
                                        // And breaking the loop if scale is unchanged or perfect, or if we've just had enough
                                        } while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
                                }

                                tween.unit = unit;
                                tween.start = start;
                                // If a +=/-= token was provided, we're doing a relative animation
                                tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
                        }
                        return tween;
                }]
        };

// Animations created synchronously will run synchronously
function createFxNow() {
        setTimeout(function() {
                fxNow = undefined;
        }, 0 );
        return ( fxNow = jQuery.now() );
}

function createTweens( animation, props ) {
        jQuery.each( props, function( prop, value ) {
                var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
                        index = 0,
                        length = collection.length;
                for ( ; index < length; index++ ) {
                        if ( collection[ index ].call( animation, prop, value ) ) {

                                // we're done with this property
                                return;
                        }
                }
        });
}

function Animation( elem, properties, options ) {
        var result,
                index = 0,
                tweenerIndex = 0,
                length = animationPrefilters.length,
                deferred = jQuery.Deferred().always( function() {
                        // don't match elem in the :animated selector
                        delete tick.elem;
                }),
                tick = function() {
                        var currentTime = fxNow || createFxNow(),
                                remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
                                // archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
                                temp = remaining / animation.duration || 0,
                                percent = 1 - temp,
                                index = 0,
                                length = animation.tweens.length;

                        for ( ; index < length ; index++ ) {
                                animation.tweens[ index ].run( percent );
                        }

                        deferred.notifyWith( elem, [ animation, percent, remaining ]);

                        if ( percent < 1 && length ) {
                                return remaining;
                        } else {
                                deferred.resolveWith( elem, [ animation ] );
                                return false;
                        }
                },
                animation = deferred.promise({
                        elem: elem,
                        props: jQuery.extend( {}, properties ),
                        opts: jQuery.extend( true, { specialEasing: {} }, options ),
                        originalProperties: properties,
                        originalOptions: options,
                        startTime: fxNow || createFxNow(),
                        duration: options.duration,
                        tweens: [],
                        createTween: function( prop, end, easing ) {
                                var tween = jQuery.Tween( elem, animation.opts, prop, end,
                                                animation.opts.specialEasing[ prop ] || animation.opts.easing );
                                animation.tweens.push( tween );
                                return tween;
                        },
                        stop: function( gotoEnd ) {
                                var index = 0,
                                        // if we are going to the end, we want to run all the tweens
                                        // otherwise we skip this part
                                        length = gotoEnd ? animation.tweens.length : 0;

                                for ( ; index < length ; index++ ) {
                                        animation.tweens[ index ].run( 1 );
                                }

                                // resolve when we played the last frame
                                // otherwise, reject
                                if ( gotoEnd ) {
                                        deferred.resolveWith( elem, [ animation, gotoEnd ] );
                                } else {
                                        deferred.rejectWith( elem, [ animation, gotoEnd ] );
                                }
                                return this;
                        }
                }),
                props = animation.props;

        propFilter( props, animation.opts.specialEasing );

        for ( ; index < length ; index++ ) {
                result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
                if ( result ) {
                        return result;
                }
        }

        createTweens( animation, props );

        if ( jQuery.isFunction( animation.opts.start ) ) {
                animation.opts.start.call( elem, animation );
        }

        jQuery.fx.timer(
                jQuery.extend( tick, {
                        anim: animation,
                        queue: animation.opts.queue,
                        elem: elem
                })
        );

        // attach callbacks from options
        return animation.progress( animation.opts.progress )
                .done( animation.opts.done, animation.opts.complete )
                .fail( animation.opts.fail )
                .always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
        var index, name, easing, value, hooks;

        // camelCase, specialEasing and expand cssHook pass
        for ( index in props ) {
                name = jQuery.camelCase( index );
                easing = specialEasing[ name ];
                value = props[ index ];
                if ( jQuery.isArray( value ) ) {
                        easing = value[ 1 ];
                        value = props[ index ] = value[ 0 ];
                }

                if ( index !== name ) {
                        props[ name ] = value;
                        delete props[ index ];
                }

                hooks = jQuery.cssHooks[ name ];
                if ( hooks && "expand" in hooks ) {
                        value = hooks.expand( value );
                        delete props[ name ];

                        // not quite $.extend, this wont overwrite keys already present.
                        // also - reusing 'index' from above because we have the correct "name"
                        for ( index in value ) {
                                if ( !( index in props ) ) {
                                        props[ index ] = value[ index ];
                                        specialEasing[ index ] = easing;
                                }
                        }
                } else {
                        specialEasing[ name ] = easing;
                }
        }
}

jQuery.Animation = jQuery.extend( Animation, {

        tweener: function( props, callback ) {
                if ( jQuery.isFunction( props ) ) {
                        callback = props;
                        props = [ "*" ];
                } else {
                        props = props.split(" ");
                }

                var prop,
                        index = 0,
                        length = props.length;

                for ( ; index < length ; index++ ) {
                        prop = props[ index ];
                        tweeners[ prop ] = tweeners[ prop ] || [];
                        tweeners[ prop ].unshift( callback );
                }
        },

        prefilter: function( callback, prepend ) {
                if ( prepend ) {
                        animationPrefilters.unshift( callback );
                } else {
                        animationPrefilters.push( callback );
                }
        }
});

function defaultPrefilter( elem, props, opts ) {
        var index, prop, value, length, dataShow, toggle, tween, hooks, oldfire,
                anim = this,
                style = elem.style,
                orig = {},
                handled = [],
                hidden = elem.nodeType && isHidden( elem );

        // handle queue: false promises
        if ( !opts.queue ) {
                hooks = jQuery._queueHooks( elem, "fx" );
                if ( hooks.unqueued == null ) {
                        hooks.unqueued = 0;
                        oldfire = hooks.empty.fire;
                        hooks.empty.fire = function() {
                                if ( !hooks.unqueued ) {
                                        oldfire();
                                }
                        };
                }
                hooks.unqueued++;

                anim.always(function() {
                        // doing this makes sure that the complete handler will be called
                        // before this completes
                        anim.always(function() {
                                hooks.unqueued--;
                                if ( !jQuery.queue( elem, "fx" ).length ) {
                                        hooks.empty.fire();
                                }
                        });
                });
        }

        // height/width overflow pass
        if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
                // Make sure that nothing sneaks out
                // Record all 3 overflow attributes because IE does not
                // change the overflow attribute when overflowX and
                // overflowY are set to the same value
                opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

                // Set display property to inline-block for height/width
                // animations on inline elements that are having width/height animated
                if ( jQuery.css( elem, "display" ) === "inline" &&
                                jQuery.css( elem, "float" ) === "none" ) {

                        // inline-level elements accept inline-block;
                        // block-level elements need to be inline with layout
                        if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
                                style.display = "inline-block";

                        } else {
                                style.zoom = 1;
                        }
                }
        }

        if ( opts.overflow ) {
                style.overflow = "hidden";
                if ( !jQuery.support.shrinkWrapBlocks ) {
                        anim.done(function() {
                                style.overflow = opts.overflow[ 0 ];
                                style.overflowX = opts.overflow[ 1 ];
                                style.overflowY = opts.overflow[ 2 ];
                        });
                }
        }


        // show/hide pass
        for ( index in props ) {
                value = props[ index ];
                if ( rfxtypes.exec( value ) ) {
                        delete props[ index ];
                        toggle = toggle || value === "toggle";
                        if ( value === ( hidden ? "hide" : "show" ) ) {
                                continue;
                        }
                        handled.push( index );
                }
        }

        length = handled.length;
        if ( length ) {
                dataShow = jQuery._data( elem, "fxshow" ) || jQuery._data( elem, "fxshow", {} );
                if ( "hidden" in dataShow ) {
                        hidden = dataShow.hidden;
                }

                // store state if its toggle - enables .stop().toggle() to "reverse"
                if ( toggle ) {
                        dataShow.hidden = !hidden;
                }
                if ( hidden ) {
                        jQuery( elem ).show();
                } else {
                        anim.done(function() {
                                jQuery( elem ).hide();
                        });
                }
                anim.done(function() {
                        var prop;
                        jQuery.removeData( elem, "fxshow", true );
                        for ( prop in orig ) {
                                jQuery.style( elem, prop, orig[ prop ] );
                        }
                });
                for ( index = 0 ; index < length ; index++ ) {
                        prop = handled[ index ];
                        tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
                        orig[ prop ] = dataShow[ prop ] || jQuery.style( elem, prop );

                        if ( !( prop in dataShow ) ) {
                                dataShow[ prop ] = tween.start;
                                if ( hidden ) {
                                        tween.end = tween.start;
                                        tween.start = prop === "width" || prop === "height" ? 1 : 0;
                                }
                        }
                }
        }
}

function Tween( elem, options, prop, end, easing ) {
        return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
        constructor: Tween,
        init: function( elem, options, prop, end, easing, unit ) {
                this.elem = elem;
                this.prop = prop;
                this.easing = easing || "swing";
                this.options = options;
                this.start = this.now = this.cur();
                this.end = end;
                this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
        },
        cur: function() {
                var hooks = Tween.propHooks[ this.prop ];

                return hooks && hooks.get ?
                        hooks.get( this ) :
                        Tween.propHooks._default.get( this );
        },
        run: function( percent ) {
                var eased,
                        hooks = Tween.propHooks[ this.prop ];

                if ( this.options.duration ) {
                        this.pos = eased = jQuery.easing[ this.easing ](
                                percent, this.options.duration * percent, 0, 1, this.options.duration
                        );
                } else {
                        this.pos = eased = percent;
                }
                this.now = ( this.end - this.start ) * eased + this.start;

                if ( this.options.step ) {
                        this.options.step.call( this.elem, this.now, this );
                }

                if ( hooks && hooks.set ) {
                        hooks.set( this );
                } else {
                        Tween.propHooks._default.set( this );
                }
                return this;
        }
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
        _default: {
                get: function( tween ) {
                        var result;

                        if ( tween.elem[ tween.prop ] != null &&
                                (!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
                                return tween.elem[ tween.prop ];
                        }

                        // passing any value as a 4th parameter to .css will automatically
                        // attempt a parseFloat and fallback to a string if the parse fails
                        // so, simple values such as "10px" are parsed to Float.
                        // complex values such as "rotate(1rad)" are returned as is.
                        result = jQuery.css( tween.elem, tween.prop, false, "" );
                        // Empty strings, null, undefined and "auto" are converted to 0.
                        return !result || result === "auto" ? 0 : result;
                },
                set: function( tween ) {
                        // use step hook for back compat - use cssHook if its there - use .style if its
                        // available and use plain properties where available
                        if ( jQuery.fx.step[ tween.prop ] ) {
                                jQuery.fx.step[ tween.prop ]( tween );
                        } else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
                                jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
                        } else {
                                tween.elem[ tween.prop ] = tween.now;
                        }
                }
        }
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
        set: function( tween ) {
                if ( tween.elem.nodeType && tween.elem.parentNode ) {
                        tween.elem[ tween.prop ] = tween.now;
                }
        }
};

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
        var cssFn = jQuery.fn[ name ];
        jQuery.fn[ name ] = function( speed, easing, callback ) {
                return speed == null || typeof speed === "boolean" ||
                        // special check for .toggle( handler, handler, ... )
                        ( !i && jQuery.isFunction( speed ) && jQuery.isFunction( easing ) ) ?
                        cssFn.apply( this, arguments ) :
                        this.animate( genFx( name, true ), speed, easing, callback );
        };
});

jQuery.fn.extend({
        fadeTo: function( speed, to, easing, callback ) {

                // show any hidden elements after setting opacity to 0
                return this.filter( isHidden ).css( "opacity", 0 ).show()

                        // animate to the value specified
                        .end().animate({ opacity: to }, speed, easing, callback );
        },
        animate: function( prop, speed, easing, callback ) {
                var empty = jQuery.isEmptyObject( prop ),
                        optall = jQuery.speed( speed, easing, callback ),
                        doAnimation = function() {
                                // Operate on a copy of prop so per-property easing won't be lost
                                var anim = Animation( this, jQuery.extend( {}, prop ), optall );

                                // Empty animations resolve immediately
                                if ( empty ) {
                                        anim.stop( true );
                                }
                        };

                return empty || optall.queue === false ?
                        this.each( doAnimation ) :
                        this.queue( optall.queue, doAnimation );
        },
        stop: function( type, clearQueue, gotoEnd ) {
                var stopQueue = function( hooks ) {
                        var stop = hooks.stop;
                        delete hooks.stop;
                        stop( gotoEnd );
                };

                if ( typeof type !== "string" ) {
                        gotoEnd = clearQueue;
                        clearQueue = type;
                        type = undefined;
                }
                if ( clearQueue && type !== false ) {
                        this.queue( type || "fx", [] );
                }

                return this.each(function() {
                        var dequeue = true,
                                index = type != null && type + "queueHooks",
                                timers = jQuery.timers,
                                data = jQuery._data( this );

                        if ( index ) {
                                if ( data[ index ] && data[ index ].stop ) {
                                        stopQueue( data[ index ] );
                                }
                        } else {
                                for ( index in data ) {
                                        if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
                                                stopQueue( data[ index ] );
                                        }
                                }
                        }

                        for ( index = timers.length; index--; ) {
                                if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
                                        timers[ index ].anim.stop( gotoEnd );
                                        dequeue = false;
                                        timers.splice( index, 1 );
                                }
                        }

                        // start the next in the queue if the last step wasn't forced
                        // timers currently will call their complete callbacks, which will dequeue
                        // but only if they were gotoEnd
                        if ( dequeue || !gotoEnd ) {
                                jQuery.dequeue( this, type );
                        }
                });
        }
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
        var which,
                attrs = { height: type },
                i = 0;

        // if we include width, step value is 1 to do all cssExpand values,
        // if we don't include width, step value is 2 to skip over Left and Right
        includeWidth = includeWidth? 1 : 0;
        for( ; i < 4 ; i += 2 - includeWidth ) {
                which = cssExpand[ i ];
                attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
        }

        if ( includeWidth ) {
                attrs.opacity = attrs.width = type;
        }

        return attrs;
}

// Generate shortcuts for custom animations
jQuery.each({
        slideDown: genFx("show"),
        slideUp: genFx("hide"),
        slideToggle: genFx("toggle"),
        fadeIn: { opacity: "show" },
        fadeOut: { opacity: "hide" },
        fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
        jQuery.fn[ name ] = function( speed, easing, callback ) {
                return this.animate( props, speed, easing, callback );
        };
});

jQuery.speed = function( speed, easing, fn ) {
        var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
                complete: fn || !fn && easing ||
                        jQuery.isFunction( speed ) && speed,
                duration: speed,
                easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
        };

        opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
                opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

        // normalize opt.queue - true/undefined/null -> "fx"
        if ( opt.queue == null || opt.queue === true ) {
                opt.queue = "fx";
        }

        // Queueing
        opt.old = opt.complete;

        opt.complete = function() {
                if ( jQuery.isFunction( opt.old ) ) {
                        opt.old.call( this );
                }

                if ( opt.queue ) {
                        jQuery.dequeue( this, opt.queue );
                }
        };

        return opt;
};

jQuery.easing = {
        linear: function( p ) {
                return p;
        },
        swing: function( p ) {
                return 0.5 - Math.cos( p*Math.PI ) / 2;
        }
};

jQuery.timers = [];
jQuery.fx = Tween.prototype.init;
jQuery.fx.tick = function() {
        var timer,
                timers = jQuery.timers,
                i = 0;

        fxNow = jQuery.now();

        for ( ; i < timers.length; i++ ) {
                timer = timers[ i ];
                // Checks the timer has not already been removed
                if ( !timer() && timers[ i ] === timer ) {
                        timers.splice( i--, 1 );
                }
        }

        if ( !timers.length ) {
                jQuery.fx.stop();
        }
        fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
        if ( timer() && jQuery.timers.push( timer ) && !timerId ) {
                timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
        }
};

jQuery.fx.interval = 13;

jQuery.fx.stop = function() {
        clearInterval( timerId );
        timerId = null;
};

jQuery.fx.speeds = {
        slow: 600,
        fast: 200,
        // Default speed
        _default: 400
};

// Back Compat <1.8 extension point
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
        jQuery.expr.filters.animated = function( elem ) {
                return jQuery.grep(jQuery.timers, function( fn ) {
                        return elem === fn.elem;
                }).length;
        };
}
var rroot = /^(?:body|html)$/i;

jQuery.fn.offset = function( options ) {
        if ( arguments.length ) {
                return options === undefined ?
                        this :
                        this.each(function( i ) {
                                jQuery.offset.setOffset( this, options, i );
                        });
        }

        var docElem, body, win, clientTop, clientLeft, scrollTop, scrollLeft,
                box = { top: 0, left: 0 },
                elem = this[ 0 ],
                doc = elem && elem.ownerDocument;

        if ( !doc ) {
                return;
        }

        if ( (body = doc.body) === elem ) {
                return jQuery.offset.bodyOffset( elem );
        }

        docElem = doc.documentElement;

        // Make sure it's not a disconnected DOM node
        if ( !jQuery.contains( docElem, elem ) ) {
                return box;
        }

        // If we don't have gBCR, just use 0,0 rather than error
        // BlackBerry 5, iOS 3 (original iPhone)
        if ( typeof elem.getBoundingClientRect !== "undefined" ) {
                box = elem.getBoundingClientRect();
        }
        win = getWindow( doc );
        clientTop  = docElem.clientTop  || body.clientTop  || 0;
        clientLeft = docElem.clientLeft || body.clientLeft || 0;
        scrollTop  = win.pageYOffset || docElem.scrollTop;
        scrollLeft = win.pageXOffset || docElem.scrollLeft;
        return {
                top: box.top  + scrollTop  - clientTop,
                left: box.left + scrollLeft - clientLeft
        };
};

jQuery.offset = {

        bodyOffset: function( body ) {
                var top = body.offsetTop,
                        left = body.offsetLeft;

                if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
                        top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
                        left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
                }

                return { top: top, left: left };
        },

        setOffset: function( elem, options, i ) {
                var position = jQuery.css( elem, "position" );

                // set position first, in-case top/left are set even on static elem
                if ( position === "static" ) {
                        elem.style.position = "relative";
                }

                var curElem = jQuery( elem ),
                        curOffset = curElem.offset(),
                        curCSSTop = jQuery.css( elem, "top" ),
                        curCSSLeft = jQuery.css( elem, "left" ),
                        calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
                        props = {}, curPosition = {}, curTop, curLeft;

                // need to be able to calculate position if either top or left is auto and position is either absolute or fixed
                if ( calculatePosition ) {
                        curPosition = curElem.position();
                        curTop = curPosition.top;
                        curLeft = curPosition.left;
                } else {
                        curTop = parseFloat( curCSSTop ) || 0;
                        curLeft = parseFloat( curCSSLeft ) || 0;
                }

                if ( jQuery.isFunction( options ) ) {
                        options = options.call( elem, i, curOffset );
                }

                if ( options.top != null ) {
                        props.top = ( options.top - curOffset.top ) + curTop;
                }
                if ( options.left != null ) {
                        props.left = ( options.left - curOffset.left ) + curLeft;
                }

                if ( "using" in options ) {
                        options.using.call( elem, props );
                } else {
                        curElem.css( props );
                }
        }
};


jQuery.fn.extend({

        position: function() {
                if ( !this[0] ) {
                        return;
                }

                var elem = this[0],

                // Get *real* offsetParent
                offsetParent = this.offsetParent(),

                // Get correct offsets
                offset       = this.offset(),
                parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

                // Subtract element margins
                // note: when an element has margin: auto the offsetLeft and marginLeft
                // are the same in Safari causing offset.left to incorrectly be 0
                offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
                offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

                // Add offsetParent borders
                parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
                parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

                // Subtract the two offsets
                return {
                        top:  offset.top  - parentOffset.top,
                        left: offset.left - parentOffset.left
                };
        },

        offsetParent: function() {
                return this.map(function() {
                        var offsetParent = this.offsetParent || document.body;
                        while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
                                offsetParent = offsetParent.offsetParent;
                        }
                        return offsetParent || document.body;
                });
        }
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
        var top = /Y/.test( prop );

        jQuery.fn[ method ] = function( val ) {
                return jQuery.access( this, function( elem, method, val ) {
                        var win = getWindow( elem );

                        if ( val === undefined ) {
                                return win ? (prop in win) ? win[ prop ] :
                                        win.document.documentElement[ method ] :
                                        elem[ method ];
                        }

                        if ( win ) {
                                win.scrollTo(
                                        !top ? val : jQuery( win ).scrollLeft(),
                                         top ? val : jQuery( win ).scrollTop()
                                );

                        } else {
                                elem[ method ] = val;
                        }
                }, method, val, arguments.length, null );
        };
});

function getWindow( elem ) {
        return jQuery.isWindow( elem ) ?
                elem :
                elem.nodeType === 9 ?
                        elem.defaultView || elem.parentWindow :
                        false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
        jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
                // margin is only for outerHeight, outerWidth
                jQuery.fn[ funcName ] = function( margin, value ) {
                        var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
                                extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

                        return jQuery.access( this, function( elem, type, value ) {
                                var doc;

                                if ( jQuery.isWindow( elem ) ) {
                                        // As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
                                        // isn't a whole lot we can do. See pull request at this URL for discussion:
                                        // https://github.com/jquery/jquery/pull/764
                                        return elem.document.documentElement[ "client" + name ];
                                }

                                // Get document width or height
                                if ( elem.nodeType === 9 ) {
                                        doc = elem.documentElement;

                                        // Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
                                        // unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
                                        return Math.max(
                                                elem.body[ "scroll" + name ], doc[ "scroll" + name ],
                                                elem.body[ "offset" + name ], doc[ "offset" + name ],
                                                doc[ "client" + name ]
                                        );
                                }

                                return value === undefined ?
                                        // Get width or height on the element, requesting but not forcing parseFloat
                                        jQuery.css( elem, type, value, extra ) :

                                        // Set width or height on the element
                                        jQuery.style( elem, type, value, extra );
                        }, type, chainable ? margin : undefined, chainable, null );
                };
        });
});
// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
        define( "jquery", [], function () { return jQuery; } );
}

})( window );

define('mockup-registry',[
  'jquery'
], function($, undefined) {
  

  var Registry = {

    patterns: {},

    warn: function(msg) {
      /* istanbul ignore next */
      if (window.DEBUG && window.console) {
        console.warn(msg);
      }
    },

    getOptions: function($el, patternName, options) {
      options = options || {};

      // get options from parent element first, stop if element tag name is 'body'
      if ($el.length !== 0 && !$.nodeName($el[0], 'body')) {
        options = Registry.getOptions($el.parent(), patternName, options);
      }

      // collect all options from element
      var elOptions = {};
      if ($el.length !== 0) {
        elOptions = $el.data('pat-' + patternName);
        if (elOptions) {
          // parse options if string
          if (typeof(elOptions) === 'string') {
            var tmpOptions = {};
            $.each(elOptions.split(';'), function(i, item) {
              item = item.split(':');
              item.reverse();
              var key = item.pop();
              key = key.replace(/^\s+|\s+$/g, '');  // trim
              item.reverse();
              var value = item.join(':');
              value = value.replace(/^\s+|\s+$/g, '');  // trim
              tmpOptions[key] = value;
            });
            elOptions = tmpOptions;
          }
        }
      }

      return $.extend(true, {}, options, elOptions);
    },

    init: function($el, patternName, options) {
      var pattern = $el.data('pattern-' + patternName);
      if (pattern === undefined && Registry.patterns[patternName]) {
        if (window.DEBUG) {
          pattern = new Registry.patterns[patternName]($el,
              Registry.getOptions($el, patternName, options));
        } else {
          try {
            pattern = new Registry.patterns[patternName]($el,
                Registry.getOptions($el, patternName, options));
          } catch (e) {
            Registry.warn('Failed while initializing "' + patternName + '" pattern.');
          }
        }
        $el.data('pattern-' + patternName, pattern);
      }
      return pattern;
    },

    scan: function(content) {
      var $content = $(content),
          patterns = [];

      patterns = $.merge(patterns, $content.filter('[class*="pat-"]'));
      patterns = $.merge(patterns, $('[class*="pat-"]', $content));

      $.each(patterns, function(i, $el) {
        $el = $($el);
        $.each($el.attr('class').split(' '), function(j, className) {
          if (className.indexOf('pat-') === 0) {
            Registry.init($el, className.substr(4));
          }
        });
      });
    },

    register: function(Pattern) {

      // require name
      if (!Pattern.prototype.name) {
        Registry.warn('Pattern didn\'t specified a name.');
        return false;
      }

      // automatically create jquery plugin from pattern
      if (Pattern.prototype.jqueryPlugin === undefined) {
        Pattern.prototype.jqueryPlugin = 'pattern' +
            Pattern.prototype.name.charAt(0).toUpperCase() +
            Pattern.prototype.name.slice(1);
      }

      $.fn[Pattern.prototype.jqueryPlugin] = function(method, options) {
        $(this).each(function() {
          if (typeof method === 'object') {
            options = method;
            method = undefined;
          }
          var $el = $(this),
              pattern = Registry.init($el, Pattern.prototype.name, options);

          if (method) {
            if (pattern[method] === undefined) {
              Registry.warn('Method "' + method + '" does not exists.');
              return false;
            }
            if (method.charAt(0) === '_') {
              Registry.warn('Method "' + method + '" is private.');
              return false;
            }
            pattern[method].apply(pattern, [options]);
          }
        });
        return this;
      };

      Registry.patterns[Pattern.prototype.name] = Pattern;
    }

  };

  return Registry;
});

// Patterns
//
// Author: Rok Garbas
// Contact: rok@garbas.si
// Version: 1.0
// Depends: jquery.js
//
// Description:
//
// License:
//
// Copyright (C) 2010 Plone Foundation
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program; if not, write to the Free Software Foundation, Inc., 51
// Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
//


define('mockup-patterns-base',[
  'jquery',
  'mockup-registry'
], function($, Registry) {
  

  // Base Pattern
  var Base = function($el, options) {
    this.$el = $el;
    this.options = $.extend(true, {}, this.defaults || {}, options || {});
    this.init();
    this.trigger('init');
  };
  Base.prototype = {
    constructor: Base,
    on: function(eventName, eventCallback) {
      this.$el.on(eventName + '.' + this.name + '.patterns', eventCallback);
    },
    trigger: function(eventName, args) {
      // args should be a list
      if (args === undefined) {
        args = [];
      }
      this.$el.trigger(eventName + '.' + this.name + '.patterns', args);
    }
  };
  Base.extend = function(NewPattern) {
    var Base = this, Constructor;

    if (NewPattern && NewPattern.hasOwnProperty('constructor')) {
      Constructor = NewPattern.constructor;
    } else {
      Constructor = function() { Base.apply(this, arguments); };
    }

    var Surrogate = function() { this.constructor = Constructor; };
    Surrogate.prototype = Base.prototype;
    Constructor.prototype = new Surrogate();
    Constructor.extend = Base.extend;

    $.extend(true, Constructor.prototype, NewPattern);

    Constructor.__super__ = Base.prototype;

    Registry.register(Constructor);

    return Constructor;
  };

  return Base;
});

/**
 * This plugin is used to define the mosaic namespace
 *
 * @author Rob Gietema
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 * @version 0.1
 */


/*global tiledata: false, jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Create the mosaic namespace
    $.mosaic = {
        "loaded": false,
        "nrOfTiles": 0,
        "tileInitCount": 0
    };

    /**
     * Called upon full initialization (that is: when all tiles have
     * been loaded).
     * @id jQuery.mosaic.initialized
     */
    $.mosaic.initialized = function () {
        if ($.mosaic.loaded) {
            return;
        }
        $.mosaic.loaded = true;

        // Take first snapshot
        $.mosaic.undo.snapshot();
    };

    /**
     * Initialize the Mosaic
     *
     * @id jQuery.mosaic.init
     * @param {Object} options Options used to initialize the UI
     */
    $.mosaic.init = function (options) {
        options = $.extend({
            url: window.document.location.href,
            type: '',
            ignore_context: false
        }, options);

        // Set document
        $.mosaic.document = window.document;

        // Local variables
        var match;

        // Initialize modules
        $.mosaic.initActions();

        // Get the url of the page
        match = options.url.match(/^([\w#!:.?+=&%@!\-\/]+)\/edit$/);
        if (match) {
            options.url = match[1];
        }

        // Chop add
        match = options.url
            .match(/^([\w#:.?=%@!\-\/]+)\/\+\+add\+\+([\w#!:.?+=&%@!\-\/]+)$/);
        if (match) {
            options.url = match[1];
            options.type = match[2];
            options.ignore_context = true;
        }


        // Local variables
        var content;

        // Add global options
        $.mosaic.options = options.data;
        $.mosaic.options.url = options.url;
        $.mosaic.options.ignore_context = options.ignore_context;
        $.mosaic.options.tileheadelements = [];

        content = $('[name="form.widgets.ILayoutAware.content"]').val();

        // Check if no layout
        if (content === '') {

            // Exit
            return;
        }

        // Get dom tree
        content = $.mosaic.getDomTreeFromHtml(content);
        $.mosaic.options.layout = content.attr('data-layout');
        // Find panels
        content.find("[data-panel]").each(function () {

            // Local variables
            var panel_id = $(this).attr("data-panel"),
                target = $("[data-panel=" + panel_id + "]",
                $.mosaic.document);

            // If content, create a new div since the form data is in
            // this panel
            if (panel_id === 'content') {
                target
                    .removeAttr('data-panel')
                    .removeAttr('id')
                    .addClass('mosaic-original-content')
                    .hide();
                target.before($(document.createElement("div"))
                    .attr("id", "content")
                    .addClass('mosaic-panel')
                    .attr('data-panel', 'content')
                    .html(content.find("[data-panel=" +
                        panel_id + "]").html())
                );
            } else {
                target.addClass('mosaic-panel');
                target.html(content.find("[data-panel=" +
                    panel_id + "]").html());
            }
        });

        // Init app tiles
        $.mosaic.options.panels = $(".mosaic-panel", $.mosaic.document);
        $.mosaic.nrOfTiles =
            $.mosaic.options.panels.find("[data-tile]").size();

        $.mosaic.options.panels.find("[data-tile]").each(function () {

            // Local variables
            var target, href, tile_content, tiletype, classes, url,
                tile_config, x, tile_group, y, fieldhtml, lines, i;

            href = $(this).attr("data-tile");

            // Get tile type
            tile_content = $(this).parent();
            tiletype = '';
            classes = tile_content.parents('.mosaic-tile').attr('class')
                .split(" ");
            $(classes).each(function () {

                // Local variables
                var classname;

                classname = this.match(/^mosaic-([\w.\-]+)-tile$/);
                if (classname !== null) {
                    if ((classname[1] !== 'selected') &&
                        (classname[1] !== 'new') &&
                        (classname[1] !== 'read-only') &&
                        (classname[1] !== 'helper') &&
                        (classname[1] !== 'original')) {
                        tiletype = classname[1];
                    }
                }
            });

            // Get tile config
            for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                tile_group = $.mosaic.options.tiles[x];
                for (y = 0; y < tile_group.tiles.length; y += 1) {

                    // Set settings value
                    if (tile_group.tiles[y].tile_type === 'field') {
                        switch (tile_group.tiles[y].widget) {
                        case "z3c.form.browser.text.TextWidget":
                        case "z3c.form.browser.text.TextFieldWidget":
                        case "z3c.form.browser.textarea.TextAreaWidget":
                        case "z3c.form.browser.textarea.TextAreaFieldWidget":
                        case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                        case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                            tile_group.tiles[y].settings = false;
                            break;
                        default:
                            tile_group.tiles[y].settings = true;
                        }
                    }
                    if (tile_group.tiles[y].name === tiletype) {
                        tile_config = tile_group.tiles[y];
                    }
                }
            }

            // Check if a field tile
            if (tile_config.tile_type === 'field') {

                fieldhtml = '';

                switch (tile_config.widget) {
                case "z3c.form.browser.text.TextWidget":
                case "z3c.form.browser.text.TextFieldWidget":
                    fieldhtml = '<div>' +
                        $("#" + tile_config.id)
                              .find('input').attr('value') + '</div>';
                    break;
                case "z3c.form.browser.textarea.TextAreaWidget":
                case "z3c.form.browser.textarea.TextAreaFieldWidget":
                    lines = $("#" + tile_config.id)
                                .find('textarea')
                                .attr('value').split('\n');
                    for (i = 0; i < lines.length; i += 1) {
                        fieldhtml += '<div>' + lines[i] + '</div>';
                    }
                    break;
                case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
                case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                    fieldhtml = $("#" + tile_config.id)
                                    .find('textarea').attr('value');
                    break;
                default:
                    fieldhtml = '<div class="discreet">Placeholder ' +
                        'for field:<br/><b>' + tile_config.label +
                        '</b></div>';
                    break;
                }
                tile_content.html(fieldhtml);

            // Get data from app tile
            } else {
                url = href;
                if (tile_config.name ===
                    'plone.app.standardtiles.title' ||
                    tile_config.name ===
                    'plone.app.standardtiles.description') {
                    url += '?ignore_context=' +
                        $.mosaic.options.ignore_context;
                }
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (value) {

                        // Get dom tree
                        value = $.mosaic.getDomTreeFromHtml(value);

                        // Add head tags
                        $.mosaic.addHeadTags(href, value);

                        tile_content
                            .html('<p class="hiddenStructure ' +
                                'tileUrl">' + href + '</p>' +
                                value.find('.temp_body_tag').html());

                        $.mosaic.tileInitCount += 1;

                        if ($.mosaic.tileInitCount >= $.mosaic.nrOfTiles) {
                            $.mosaic.initialized();
                        }
                    }
                });
            }
        });

        // Init overlay
//                $('#content.mosaic-original-content',
//                  $.mosaic.document).mosaicOverlay();

        // Add toolbar div below menu
        $("body").prepend($(document.createElement("div"))
            .addClass("mosaic-toolbar")
        );

        // Add the toolbar to the options
        $.mosaic.options.toolbar = $(".mosaic-toolbar");

        // Add page url to the options
        $.mosaic.options.url = options.url;

        // Init toolbar
        $.mosaic.options.toolbar.mosaicToolbar();

        // Init panel
        $.mosaic.options.panels.mosaicLayout();

        // Add blur to the rest of the content
        $("*", $.mosaic.document).each(function () {

            // Local variables
            var obj;

            obj = $(this);

            // Check if block element
            if (obj.css('display') === 'block') {

                // Check if panel or toolbar
                if (!obj.hasClass('mosaic-panel') &&
                    !obj.hasClass('mosaic-toolbar') &&
                    !obj.hasClass('mosaic-notifications') &&
                    obj.attr('id') !== 'plone-cmsui-menu') {

                    // Check if inside panel or toolbar
                    if (obj.parents('.mosaic-panel, .mosaic-toolbar')
                        .length === 0) {

                        // Check if parent of a panel or toolbar
                        if (obj.find('.mosaic-panel, .mosaic-toolbar')
                            .length === 0) {

                            // Check if parent has a child who is a
                            // panel or a toolbar
                            if (obj.parent()
                                .find('.mosaic-panel, .mosaic-toolbar')
                                .length !== 0) {

                                // Add blur class
                                obj.addClass('mosaic-blur');
                            }
                        }
                    }
                }
            }
        });

        // Init upload
        // $.mosaic.initUpload();
        $.mosaic.undo.init();

    };

    /**
     * Get the dom tree of the specified content
     *
     * @id jQuery.mosaic.getDomTreeFromHtml
     * @param {String} content Html content
     * @return {Object} Dom tree of the html
     */
    $.mosaic.getDomTreeFromHtml = function (content) {

        // Remove doctype and replace html, head and body tag since the are
        // stripped when converting to jQuery object
        content = content.replace(/<!DOCTYPE[\w\s\- .\/\":]+>/, '');
        content = content.replace(/<html/, "<div class=\"temp_html_tag\"");
        content = content.replace(/<\/html/, "</div");
        content = content.replace(/<head/, "<div class=\"temp_head_tag\"");
        content = content.replace(/<\/head/, "</div");
        content = content.replace(/<body/, "<div class=\"temp_body_tag\"");
        content = content.replace(/<\/body/, "</div");
        return $($(content)[0]);
    };

    /**
     * Remove head tags based on tile url
     *
     * @id jQuery.mosaic.removeHeadTags
     * @param {String} url Url of the tile
     */
    $.mosaic.removeHeadTags = function (url) {

        // Local variables
        var tile_type_id, html_id, headelements, i;

        // Calc delete url
        url = url.split('?')[0];
        url = url.split('@@');
        tile_type_id = url[1].split('/');
        url = url[0] + '@@delete-tile?type=' + tile_type_id[0] + '&id=' +
            tile_type_id[1] + '&confirm=true';
        html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];

        // Remove head elements
        headelements = $.mosaic.options.tileheadelements[html_id];
        for (i = 0; i < headelements.length; i += 1) {
            $(headelements[i], $.mosaic.document).remove();
        }
        $.mosaic.options.tileheadelements[html_id] = [];
    };

    /**
     * Add head tags based on tile url and dom
     *
     * @id jQuery.mosaic.addHeadTags
     * @param {String} url Url of the tile
     * @param {Object} dom Dom object of the tile
     */
    $.mosaic.addHeadTags = function (url, dom) {

        // Local variables
        var tile_type_id, html_id;

        // Calc url
        url = url.split('?')[0];
        url = url.split('@@');
        tile_type_id = url[1].split('/');
        html_id = tile_type_id[0].replace(/\./g, '-') + '-' + tile_type_id[1];
        $.mosaic.options.tileheadelements[html_id] = [];

        // Get head items
        dom.find(".temp_head_tag").children().each(function () {

            // Add element
            $.mosaic.options.tileheadelements[html_id].push(this);

            // Add head elements
            $('head', $.mosaic.document).append(this);
        });
    };

}(jQuery));

define("mosaic.core", (function (global) {
    return function () {
        var ret, fn;
        return ret || global.window.Mosaic;
    };
}(this)));

/**
 * This plugin is used to display an overlay
 *
 * @author Rob Gietema
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 * @version 0.1
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the overlay namespace
    $.mosaic.overlay = {
    };

    /**
     * Create a new instance of a mosaic overlay.
     *
     * @constructor
     * @id jQuery.fn.mosaicOverlay
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicOverlay = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get current object
            var obj = $(this);

            // Init overlay
            obj
                .hide()
                .css({
                    'width': '900px',
                    'left': (($(window.parent).width() - 900) / 2)
                })
                .addClass("mosaic-overlay");

            // Add lightbox
            $(document.body, $.mosaic.document)
                .prepend($(document.createElement("div"))
                    .addClass("mosaic-overlay-blocker")
            );
        });
    };

    /**
     * Open the overlay
     *
     * @id jQuery.mosaic.overlay.open
     * @param {String} mode Mode of the overlay
     * @param {Object} tile_config Configuration of the tile
     */
    $.mosaic.overlay.open = function (mode, tile_config) {

        // Local variables
        var form, formtabs, tile_group, x, visible_tabs, offset_top,
            field_tile, field, fieldset;

        // Expand the overlay
        expandMenu();
        $('.overlay').show();

        // Get form
        form = $(".overlay").find("form");

        // Clear actions
        if ($(".mosaic-overlay-ok-button").length === 0) {
            $(".overlay .formControls").children("input").hide();
            $(".overlay .formControls").append(
                $(document.createElement("input")).attr({
                    'type': 'button',
                    'value': 'Ok'
                })
                .addClass('button-field context mosaic-overlay-ok-button')
                .click(function () {
                    $.mosaic.overlay.close();
                })
            );
        }

        if (mode === 'all') {

            // Get form tabs
            formtabs = form.find(".formTabs");

            // Show form tabs
            form.find(".formTabs").removeClass('mosaic-hidden');

            // Show all fields
            form.find("fieldset").children().removeClass('mosaic-hidden');

            // Hide all fieldsets
            form.find('fieldset').hide();

            // Deselect all tabs
            formtabs.find('a').removeClass('selected');

            // Remove first and last tab
            formtabs.children('.firstFormTab').removeClass('firstFormTab');
            formtabs.children('.lastFormTab').removeClass('lastFormTab');

            // Hide layout field
            form.find('#formfield-form-widgets-ILayoutAware-content')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-ILayoutAware-pageSiteLayout')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-ILayoutAware-sectionSiteLayout')
                .addClass('mosaic-hidden');

            // Hide title and description
            form.find('#formfield-form-widgets-IDublinCore-title')
                .addClass('mosaic-hidden');
            form.find('#formfield-form-widgets-IDublinCore-description')
                .addClass('mosaic-hidden');

            // Hide field which are on the wysiwyg area
            for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                if ($.mosaic.options.tiles[x].name === 'fields') {
                    tile_group = $.mosaic.options.tiles[x];
                }
            }
            for (x = 0; x < tile_group.tiles.length; x += 1) {
                field_tile = tile_group.tiles[x];
                if ($.mosaic.options.panels
                    .find(".mosaic-" + field_tile.name + "-tile").length !== 0) {
                    $($.mosaic.document.getElementById(field_tile.id))
                        .addClass('mosaic-hidden');
                }
            }

            // Hide tab if fieldset has no visible items
            form.find("fieldset").each(function () {
                if ($(this).children("div:not(.mosaic-hidden)").length === 0) {
                    $('a[href=#fieldsetlegend-' +
                        $(this).attr('id').split('-')[1] + ']')
                        .parent().addClass('mosaic-hidden');
                }
            });

            // Get visible tabs
            visible_tabs = formtabs.children(':not(.mosaic-hidden)');

            // Add first and last form tab
            visible_tabs.eq(0).addClass('firstFormTab');
            visible_tabs.eq(visible_tabs.length - 1).addClass('lastFormTab');

            // Select first tab
            visible_tabs.eq(0).children('a').addClass('selected');
            form.find('#fieldset-' +
                visible_tabs.eq(0).children('a').attr('href').split('-')[1])
                .show()

        } else if (mode === 'field') {

            // Get fieldset and field
            field = $("#" + tile_config.id);
            fieldset = field.parents("fieldset");

            // Hide all fieldsets
            form.find('fieldset').hide();

            // Show current fieldset
            fieldset.show();

            // Hide all fields in current fieldset
            fieldset.children().addClass('mosaic-hidden');

            // Show current field
            field.removeClass('mosaic-hidden');

            // Hide form tabs
            form.find(".formTabs").addClass('mosaic-hidden');
        }
    };

    /**
     * Close the overlay
     *
     * @id jQuery.mosaic.overlay.close
     */
    $.mosaic.overlay.close = function () {

        // Check if iframe is open
        if ($(".mosaic-iframe-overlay", $.mosaic.document).length !== 0) {
            $(".mosaic-iframe-overlay", $.mosaic.document).remove();
        } else {
            // Expand the overlay
            $('.overlay').hide();
            forceContractMenu();
        }
    };

    /**
     * Open an iframe overlay
     *
     * @id jQuery.mosaic.overlay.openIframe
     * @param {String} url of the iframe
     */
    $.mosaic.overlay.openIframe = function (url) {

        $(".mosaic-overlay-blocker", $.mosaic.document).show();

        $($.mosaic.document.body).append(
            $($.mosaic.document.createElement("iframe"))
                .css({
                    'position': 'absolute',
                    'width': '900px',
                    'height': '450px',
                    'top': '130px',
                    'z-index': '3000',
                    'left': (($(window.parent).width() - 900) / 2),
                    'border': '0px'
                })
                .attr({
                    'src': url
                })
                .addClass("mosaic-iframe-overlay")
        );
    };
}(jQuery));

define("mosaic.overlay", function(){});

(function(d){var a=/^\s*|\s*$/g,e,c="B".replace(/A(.)|B/,"$1")==="$1";var b={majorVersion:"@@tinymce_major_version@@",minorVersion:"@@tinymce_minor_version@@",releaseDate:"@@tinymce_release_date@@",_init:function(){var s=this,q=document,o=navigator,g=o.userAgent,m,f,l,k,j,r;s.isOpera=d.opera&&opera.buildNumber;s.isWebKit=/WebKit/.test(g);s.isIE=!s.isWebKit&&!s.isOpera&&(/MSIE/gi).test(g)&&(/Explorer/gi).test(o.appName);s.isIE6=s.isIE&&/MSIE [56]/.test(g);s.isIE7=s.isIE&&/MSIE [7]/.test(g);s.isIE8=s.isIE&&/MSIE [8]/.test(g);s.isIE9=s.isIE&&/MSIE [9]/.test(g);s.isGecko=!s.isWebKit&&/Gecko/.test(g);s.isMac=g.indexOf("Mac")!=-1;s.isAir=/adobeair/i.test(g);s.isIDevice=/(iPad|iPhone)/.test(g);s.isIOS5=s.isIDevice&&g.match(/AppleWebKit\/(\d*)/)[1]>=534;if(d.tinyMCEPreInit){s.suffix=tinyMCEPreInit.suffix;s.baseURL=tinyMCEPreInit.base;s.query=tinyMCEPreInit.query;return}s.suffix="";f=q.getElementsByTagName("base");for(m=0;m<f.length;m++){if(r=f[m].href){if(/^https?:\/\/[^\/]+$/.test(r)){r+="/"}k=r?r.match(/.*\//)[0]:""}}function h(i){if(i.src&&/tiny_mce(|_gzip|_jquery|_prototype|_full)(_dev|_src)?.js/.test(i.src)){if(/_(src|dev)\.js/g.test(i.src)){s.suffix="_src"}if((j=i.src.indexOf("?"))!=-1){s.query=i.src.substring(j+1)}s.baseURL=i.src.substring(0,i.src.lastIndexOf("/"));if(k&&s.baseURL.indexOf("://")==-1&&s.baseURL.indexOf("/")!==0){s.baseURL=k+s.baseURL}return s.baseURL}return null}f=q.getElementsByTagName("script");for(m=0;m<f.length;m++){if(h(f[m])){return}}l=q.getElementsByTagName("head")[0];if(l){f=l.getElementsByTagName("script");for(m=0;m<f.length;m++){if(h(f[m])){return}}}return},is:function(g,f){if(!f){return g!==e}if(f=="array"&&(g.hasOwnProperty&&g instanceof Array)){return true}return typeof(g)==f},makeMap:function(f,j,h){var g;f=f||[];j=j||",";if(typeof(f)=="string"){f=f.split(j)}h=h||{};g=f.length;while(g--){h[f[g]]={}}return h},each:function(i,f,h){var j,g;if(!i){return 0}h=h||i;if(i.length!==e){for(j=0,g=i.length;j<g;j++){if(f.call(h,i[j],j,i)===false){return 0}}}else{for(j in i){if(i.hasOwnProperty(j)){if(f.call(h,i[j],j,i)===false){return 0}}}}return 1},trim:function(f){return(f?""+f:"").replace(a,"")},create:function(o,f,j){var n=this,g,i,k,l,h,m=0;o=/^((static) )?([\w.]+)(:([\w.]+))?/.exec(o);k=o[3].match(/(^|\.)(\w+)$/i)[2];i=n.createNS(o[3].replace(/\.\w+$/,""),j);if(i[k]){return}if(o[2]=="static"){i[k]=f;if(this.onCreate){this.onCreate(o[2],o[3],i[k])}return}if(!f[k]){f[k]=function(){};m=1}i[k]=f[k];n.extend(i[k].prototype,f);if(o[5]){g=n.resolve(o[5]).prototype;l=o[5].match(/\.(\w+)$/i)[1];h=i[k];if(m){i[k]=function(){return g[l].apply(this,arguments)}}else{i[k]=function(){this.parent=g[l];return h.apply(this,arguments)}}i[k].prototype[k]=i[k];n.each(g,function(p,q){i[k].prototype[q]=g[q]});n.each(f,function(p,q){if(g[q]){i[k].prototype[q]=function(){this.parent=g[q];return p.apply(this,arguments)}}else{if(q!=k){i[k].prototype[q]=p}}})}n.each(f["static"],function(p,q){i[k][q]=p});if(this.onCreate){this.onCreate(o[2],o[3],i[k].prototype)}},walk:function(i,h,j,g){g=g||this;if(i){if(j){i=i[j]}b.each(i,function(k,f){if(h.call(g,k,f,j)===false){return false}b.walk(k,h,j,g)})}},createNS:function(j,h){var g,f;h=h||d;j=j.split(".");for(g=0;g<j.length;g++){f=j[g];if(!h[f]){h[f]={}}h=h[f]}return h},resolve:function(j,h){var g,f;h=h||d;j=j.split(".");for(g=0,f=j.length;g<f;g++){h=h[j[g]];if(!h){break}}return h},addUnload:function(j,i){var h=this;j={func:j,scope:i||this};if(!h.unloads){function g(){var f=h.unloads,l,m;if(f){for(m in f){l=f[m];if(l&&l.func){l.func.call(l.scope,1)}}if(d.detachEvent){d.detachEvent("onbeforeunload",k);d.detachEvent("onunload",g)}else{if(d.removeEventListener){d.removeEventListener("unload",g,false)}}h.unloads=l=f=w=g=0;if(d.CollectGarbage){CollectGarbage()}}}function k(){var l=document;if(l.readyState=="interactive"){function f(){l.detachEvent("onstop",f);if(g){g()}l=0}if(l){l.attachEvent("onstop",f)}d.setTimeout(function(){if(l){l.detachEvent("onstop",f)}},0)}}if(d.attachEvent){d.attachEvent("onunload",g);d.attachEvent("onbeforeunload",k)}else{if(d.addEventListener){d.addEventListener("unload",g,false)}}h.unloads=[j]}else{h.unloads.push(j)}return j},removeUnload:function(i){var g=this.unloads,h=null;b.each(g,function(j,f){if(j&&j.func==i){g.splice(f,1);h=i;return false}});return h},explode:function(f,g){return f?b.map(f.split(g||","),b.trim):f},_addVer:function(g){var f;if(!this.query){return g}f=(g.indexOf("?")==-1?"?":"&")+this.query;if(g.indexOf("#")==-1){return g+f}return g.replace("#",f+"#")},_replace:function(h,f,g){if(c){return g.replace(h,function(){var l=f,j=arguments,k;for(k=0;k<j.length-2;k++){if(j[k]===e){l=l.replace(new RegExp("\\$"+k,"g"),"")}else{l=l.replace(new RegExp("\\$"+k,"g"),j[k])}}return l})}return g.replace(h,f)}};b._init();d.tinymce=d.tinyMCE=b})(window);(function(e,d){var c=d.is,b=/^(href|src|style)$/i,f;if(!e&&window.console){return console.log("Load jQuery first!")}d.$=e;d.adapter={patchEditor:function(j){var i=e.fn;function h(n,o){var m=this;if(o){m.removeAttr("data-mce-style")}return i.css.apply(m,arguments)}function g(n,o){var m=this;if(b.test(n)){if(o!==f){m.each(function(p,q){j.dom.setAttrib(q,n,o)});return m}else{return m.attr("data-mce-"+n)}}return i.attr.apply(m,arguments)}function k(m){return function(n){if(n){n=j.dom.processHTML(n)}return m.call(this,n)}}function l(m){if(m.css!==h){m.css=h;m.attr=g;m.html=k(i.html);m.append=k(i.append);m.prepend=k(i.prepend);m.after=k(i.after);m.before=k(i.before);m.replaceWith=k(i.replaceWith);m.tinymce=j;m.pushStack=function(){return l(i.pushStack.apply(this,arguments))}}return m}j.$=function(m,n){var o=j.getDoc();return l(e(m||o,o||n))}}};d.extend=e.extend;d.extend(d,{map:e.map,grep:function(g,h){return e.grep(g,h||function(){return 1})},inArray:function(g,h){return e.inArray(h,g||[])}});var a={"tinymce.dom.DOMUtils":{select:function(i,h){var g=this;return e.find(i,g.get(h)||g.get(g.settings.root_element)||g.doc,[])},is:function(h,g){return e(this.get(h)).is(g)}}};d.onCreate=function(g,i,h){d.extend(h,a[i])}})(window.jQuery,tinymce);tinymce.create("tinymce.util.Dispatcher",{scope:null,listeners:null,Dispatcher:function(a){this.scope=a||this;this.listeners=[]},add:function(a,b){this.listeners.push({cb:a,scope:b||this.scope});return a},addToTop:function(a,b){this.listeners.unshift({cb:a,scope:b||this.scope});return a},remove:function(a){var b=this.listeners,c=null;tinymce.each(b,function(e,d){if(a==e.cb){c=a;b.splice(d,1);return false}});return c},dispatch:function(){var f,d=arguments,e,b=this.listeners,g;for(e=0;e<b.length;e++){g=b[e];f=g.cb.apply(g.scope,d);if(f===false){break}}return f}});(function(){var a=tinymce.each;tinymce.create("tinymce.util.URI",{URI:function(e,g){var f=this,i,d,c,h;e=tinymce.trim(e);g=f.settings=g||{};if(/^([\w\-]+):([^\/]{2})/i.test(e)||/^\s*#/.test(e)){f.source=e;return}if(e.indexOf("/")===0&&e.indexOf("//")!==0){e=(g.base_uri?g.base_uri.protocol||"http":"http")+"://mce_host"+e}if(!/^[\w-]*:?\/\//.test(e)){h=g.base_uri?g.base_uri.path:new tinymce.util.URI(location.href).directory;e=((g.base_uri&&g.base_uri.protocol)||"http")+"://mce_host"+f.toAbsPath(h,e)}e=e.replace(/@@/g,"(mce_at)");e=/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/.exec(e);a(["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],function(b,j){var k=e[j];if(k){k=k.replace(/\(mce_at\)/g,"@@")}f[b]=k});if(c=g.base_uri){if(!f.protocol){f.protocol=c.protocol}if(!f.userInfo){f.userInfo=c.userInfo}if(!f.port&&f.host=="mce_host"){f.port=c.port}if(!f.host||f.host=="mce_host"){f.host=c.host}f.source=""}},setPath:function(c){var b=this;c=/^(.*?)\/?(\w+)?$/.exec(c);b.path=c[0];b.directory=c[1];b.file=c[2];b.source="";b.getURI()},toRelative:function(b){var c=this,d;if(b==="./"){return b}b=new tinymce.util.URI(b,{base_uri:c});if((b.host!="mce_host"&&c.host!=b.host&&b.host)||c.port!=b.port||c.protocol!=b.protocol){return b.getURI()}d=c.toRelPath(c.path,b.path);if(b.query){d+="?"+b.query}if(b.anchor){d+="#"+b.anchor}return d},toAbsolute:function(b,c){var b=new tinymce.util.URI(b,{base_uri:this});return b.getURI(this.host==b.host&&this.protocol==b.protocol?c:0)},toRelPath:function(g,h){var c,f=0,d="",e,b;g=g.substring(0,g.lastIndexOf("/"));g=g.split("/");c=h.split("/");if(g.length>=c.length){for(e=0,b=g.length;e<b;e++){if(e>=c.length||g[e]!=c[e]){f=e+1;break}}}if(g.length<c.length){for(e=0,b=c.length;e<b;e++){if(e>=g.length||g[e]!=c[e]){f=e+1;break}}}if(f==1){return h}for(e=0,b=g.length-(f-1);e<b;e++){d+="../"}for(e=f-1,b=c.length;e<b;e++){if(e!=f-1){d+="/"+c[e]}else{d+=c[e]}}return d},toAbsPath:function(e,f){var c,b=0,h=[],d,g;d=/\/$/.test(f)?"/":"";e=e.split("/");f=f.split("/");a(e,function(i){if(i){h.push(i)}});e=h;for(c=f.length-1,h=[];c>=0;c--){if(f[c].length==0||f[c]=="."){continue}if(f[c]==".."){b++;continue}if(b>0){b--;continue}h.push(f[c])}c=e.length-b;if(c<=0){g=h.reverse().join("/")}else{g=e.slice(0,c).join("/")+"/"+h.reverse().join("/")}if(g.indexOf("/")!==0){g="/"+g}if(d&&g.lastIndexOf("/")!==g.length-1){g+=d}return g},getURI:function(d){var c,b=this;if(!b.source||d){c="";if(!d){if(b.protocol){c+=b.protocol+"://"}if(b.userInfo){c+=b.userInfo+"@"}if(b.host){c+=b.host}if(b.port){c+=":"+b.port}}if(b.path){c+=b.path}if(b.query){c+="?"+b.query}if(b.anchor){c+="#"+b.anchor}b.source=c}return b.source}})})();(function(){var a=tinymce.each;tinymce.create("static tinymce.util.Cookie",{getHash:function(d){var b=this.get(d),c;if(b){a(b.split("&"),function(e){e=e.split("=");c=c||{};c[unescape(e[0])]=unescape(e[1])})}return c},setHash:function(j,b,g,f,i,c){var h="";a(b,function(e,d){h+=(!h?"":"&")+escape(d)+"="+escape(e)});this.set(j,h,g,f,i,c)},get:function(i){var h=document.cookie,g,f=i+"=",d;if(!h){return}d=h.indexOf("; "+f);if(d==-1){d=h.indexOf(f);if(d!=0){return null}}else{d+=2}g=h.indexOf(";",d);if(g==-1){g=h.length}return unescape(h.substring(d+f.length,g))},set:function(i,b,g,f,h,c){document.cookie=i+"="+escape(b)+((g)?"; expires="+g.toGMTString():"")+((f)?"; path="+escape(f):"")+((h)?"; domain="+h:"")+((c)?"; secure":"")},remove:function(e,b){var c=new Date();c.setTime(c.getTime()-1000);this.set(e,"",c,b,c)}})})();(function(){function serialize(o,quote){var i,v,t;quote=quote||'"';if(o==null){return"null"}t=typeof o;if(t=="string"){v="\bb\tt\nn\ff\rr\"\"''\\\\";return quote+o.replace(/([\u0080-\uFFFF\x00-\x1f\"\'\\])/g,function(a,b){if(quote==='"'&&a==="'"){return a}i=v.indexOf(b);if(i+1){return"\\"+v.charAt(i+1)}a=b.charCodeAt().toString(16);return"\\u"+"0000".substring(a.length)+a})+quote}if(t=="object"){if(o.hasOwnProperty&&o instanceof Array){for(i=0,v="[";i<o.length;i++){v+=(i>0?",":"")+serialize(o[i],quote)}return v+"]"}v="{";for(i in o){v+=typeof o[i]!="function"?(v.length>1?","+quote:quote)+i+quote+":"+serialize(o[i],quote):""}return v+"}"}return""+o}tinymce.util.JSON={serialize:serialize,parse:function(s){try{return eval("("+s+")")}catch(ex){}}}})();tinymce.create("static tinymce.util.XHR",{send:function(g){var a,e,b=window,h=0;g.scope=g.scope||this;g.success_scope=g.success_scope||g.scope;g.error_scope=g.error_scope||g.scope;g.async=g.async===false?false:true;g.data=g.data||"";function d(i){a=0;try{a=new ActiveXObject(i)}catch(c){}return a}a=b.XMLHttpRequest?new XMLHttpRequest():d("Microsoft.XMLHTTP")||d("Msxml2.XMLHTTP");if(a){if(a.overrideMimeType){a.overrideMimeType(g.content_type)}a.open(g.type||(g.data?"POST":"GET"),g.url,g.async);if(g.content_type){a.setRequestHeader("Content-Type",g.content_type)}a.setRequestHeader("X-Requested-With","XMLHttpRequest");a.send(g.data);function f(){if(!g.async||a.readyState==4||h++>10000){if(g.success&&h<10000&&a.status==200){g.success.call(g.success_scope,""+a.responseText,a,g)}else{if(g.error){g.error.call(g.error_scope,h>10000?"TIMED_OUT":"GENERAL",a,g)}}a=null}else{b.setTimeout(f,10)}}if(!g.async){return f()}e=b.setTimeout(f,10)}}});(function(){var c=tinymce.extend,b=tinymce.util.JSON,a=tinymce.util.XHR;tinymce.create("tinymce.util.JSONRequest",{JSONRequest:function(d){this.settings=c({},d);this.count=0},send:function(f){var e=f.error,d=f.success;f=c(this.settings,f);f.success=function(h,g){h=b.parse(h);if(typeof(h)=="undefined"){h={error:"JSON Parse error."}}if(h.error){e.call(f.error_scope||f.scope,h.error,g)}else{d.call(f.success_scope||f.scope,h.result)}};f.error=function(h,g){if(e){e.call(f.error_scope||f.scope,h,g)}};f.data=b.serialize({id:f.id||"c"+(this.count++),method:f.method,params:f.params});f.content_type="application/json";a.send(f)},"static":{sendRPC:function(d){return new tinymce.util.JSONRequest().send(d)}}})}());(function(a){a.VK={DELETE:46,BACKSPACE:8}})(tinymce);(function(d){var f=d.VK,e=f.BACKSPACE,c=f.DELETE;function b(g){var i=g.dom,h=g.selection;g.onKeyDown.add(function(k,o){var j,p,m,n,l;l=o.keyCode==c;if(l||o.keyCode==e){o.preventDefault();j=h.getRng();p=i.getParent(j.startContainer,i.isBlock);if(l){p=i.getNext(p,i.isBlock)}if(p){m=p.firstChild;if(m&&m.nodeName==="SPAN"){n=m.cloneNode(false)}}k.getDoc().execCommand(l?"ForwardDelete":"Delete",false,null);p=i.getParent(j.startContainer,i.isBlock);d.each(i.select("span.Apple-style-span,font.Apple-style-span",p),function(q){var r=h.getBookmark();if(n){i.replace(n.cloneNode(false),q,true)}else{i.remove(q,true)}h.moveToBookmark(r)})}})}function a(g){g.onKeyUp.add(function(h,j){var i=j.keyCode;if(i==c||i==e){if(h.dom.isEmpty(h.getBody())){h.setContent("",{format:"raw"});h.nodeChanged();return}}})}d.create("tinymce.util.Quirks",{Quirks:function(g){if(d.isWebKit){b(g);a(g)}if(d.isIE){a(g)}}})})(tinymce);(function(j){var a,g,d,k=/[&<>\"\u007E-\uD7FF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,b=/[<>&\u007E-\uD7FF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,f=/[<>&\"\']/g,c=/&(#x|#)?([\w]+);/g,i={128:"\u20AC",130:"\u201A",131:"\u0192",132:"\u201E",133:"\u2026",134:"\u2020",135:"\u2021",136:"\u02C6",137:"\u2030",138:"\u0160",139:"\u2039",140:"\u0152",142:"\u017D",145:"\u2018",146:"\u2019",147:"\u201C",148:"\u201D",149:"\u2022",150:"\u2013",151:"\u2014",152:"\u02DC",153:"\u2122",154:"\u0161",155:"\u203A",156:"\u0153",158:"\u017E",159:"\u0178"};g={'"':"&quot;","'":"&#39;","<":"&lt;",">":"&gt;","&":"&amp;"};d={"&lt;":"<","&gt;":">","&amp;":"&","&quot;":'"',"&apos;":"'"};function h(l){var m;m=document.createElement("div");m.innerHTML=l;return m.textContent||m.innerText||l}function e(m,p){var n,o,l,q={};if(m){m=m.split(",");p=p||10;for(n=0;n<m.length;n+=2){o=String.fromCharCode(parseInt(m[n],p));if(!g[o]){l="&"+m[n+1]+";";q[o]=l;q[l]=o}}return q}}a=e("50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,t9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro",32);j.html=j.html||{};j.html.Entities={encodeRaw:function(m,l){return m.replace(l?k:b,function(n){return g[n]||n})},encodeAllRaw:function(l){return(""+l).replace(f,function(m){return g[m]||m})},encodeNumeric:function(m,l){return m.replace(l?k:b,function(n){if(n.length>1){return"&#"+(((n.charCodeAt(0)-55296)*1024)+(n.charCodeAt(1)-56320)+65536)+";"}return g[n]||"&#"+n.charCodeAt(0)+";"})},encodeNamed:function(n,l,m){m=m||a;return n.replace(l?k:b,function(o){return g[o]||m[o]||o})},getEncodeFunc:function(l,o){var p=j.html.Entities;o=e(o)||a;function m(r,q){return r.replace(q?k:b,function(s){return g[s]||o[s]||"&#"+s.charCodeAt(0)+";"||s})}function n(r,q){return p.encodeNamed(r,q,o)}l=j.makeMap(l.replace(/\+/g,","));if(l.named&&l.numeric){return m}if(l.named){if(o){return n}return p.encodeNamed}if(l.numeric){return p.encodeNumeric}return p.encodeRaw},decode:function(l){return l.replace(c,function(n,m,o){if(m){o=parseInt(o,m.length===2?16:10);if(o>65535){o-=65536;return String.fromCharCode(55296+(o>>10),56320+(o&1023))}else{return i[o]||String.fromCharCode(o)}}return d[n]||a[n]||h(n)})}}})(tinymce);tinymce.html.Styles=function(d,f){var k=/rgb\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/gi,h=/(?:url(?:(?:\(\s*\"([^\"]+)\"\s*\))|(?:\(\s*\'([^\']+)\'\s*\))|(?:\(\s*([^)\s]+)\s*\))))|(?:\'([^\']+)\')|(?:\"([^\"]+)\")/gi,b=/\s*([^:]+):\s*([^;]+);?/g,l=/\s+$/,m=/rgb/,e,g,a={},j;d=d||{};j="\\\" \\' \\; \\: ; : \uFEFF".split(" ");for(g=0;g<j.length;g++){a[j[g]]="\uFEFF"+g;a["\uFEFF"+g]=j[g]}function c(n,q,p,i){function o(r){r=parseInt(r).toString(16);return r.length>1?r:"0"+r}return"#"+o(q)+o(p)+o(i)}return{toHex:function(i){return i.replace(k,c)},parse:function(r){var y={},p,n,v,q,u=d.url_converter,x=d.url_converter_scope||this;function o(C,F){var E,B,A,D;E=y[C+"-top"+F];if(!E){return}B=y[C+"-right"+F];if(E!=B){return}A=y[C+"-bottom"+F];if(B!=A){return}D=y[C+"-left"+F];if(A!=D){return}y[C+F]=D;delete y[C+"-top"+F];delete y[C+"-right"+F];delete y[C+"-bottom"+F];delete y[C+"-left"+F]}function t(B){var C=y[B],A;if(!C||C.indexOf(" ")<0){return}C=C.split(" ");A=C.length;while(A--){if(C[A]!==C[0]){return false}}y[B]=C[0];return true}function z(C,B,A,D){if(!t(B)){return}if(!t(A)){return}if(!t(D)){return}y[C]=y[B]+" "+y[A]+" "+y[D];delete y[B];delete y[A];delete y[D]}function s(A){q=true;return a[A]}function i(B,A){if(q){B=B.replace(/\uFEFF[0-9]/g,function(C){return a[C]})}if(!A){B=B.replace(/\\([\'\";:])/g,"$1")}return B}if(r){r=r.replace(/\\[\"\';:\uFEFF]/g,s).replace(/\"[^\"]+\"|\'[^\']+\'/g,function(A){return A.replace(/[;:]/g,s)});while(p=b.exec(r)){n=p[1].replace(l,"").toLowerCase();v=p[2].replace(l,"");if(n&&v.length>0){if(n==="font-weight"&&v==="700"){v="bold"}else{if(n==="color"||n==="background-color"){v=v.toLowerCase()}}v=v.replace(k,c);v=v.replace(h,function(B,A,E,D,F,C){F=F||C;if(F){F=i(F);return"'"+F.replace(/\'/g,"\\'")+"'"}A=i(A||E||D);if(u){A=u.call(x,A,"style")}return"url('"+A.replace(/\'/g,"\\'")+"')"});y[n]=q?i(v,true):v}b.lastIndex=p.index+p[0].length}o("border","");o("border","-width");o("border","-color");o("border","-style");o("padding","");o("margin","");z("border","border-width","border-style","border-color");if(y.border==="medium none"){delete y.border}}return y},serialize:function(p,r){var o="",n,q;function i(t){var x,u,s,v;x=f.styles[t];if(x){for(u=0,s=x.length;u<s;u++){t=x[u];v=p[t];if(v!==e&&v.length>0){o+=(o.length>0?" ":"")+t+": "+v+";"}}}}if(r&&f&&f.styles){i("*");i(r)}else{for(n in p){q=p[n];if(q!==e&&q.length>0){o+=(o.length>0?" ":"")+n+": "+q+";"}}}return o}}};(function(m){var h={},j,l,g,f,c={},b,e,d=m.makeMap,k=m.each;function i(o,n){return o.split(n||",")}function a(r,q){var o,p={};function n(s){return s.replace(/[A-Z]+/g,function(t){return n(r[t])})}for(o in r){if(r.hasOwnProperty(o)){r[o]=n(r[o])}}n(q).replace(/#/g,"#text").replace(/(\w+)\[([^\]]+)\]\[([^\]]*)\]/g,function(v,t,s,u){s=i(s,"|");p[t]={attributes:d(s),attributesOrder:s,children:d(u,"|",{"#comment":{}})}});return p}l="h1,h2,h3,h4,h5,h6,hr,p,div,address,pre,form,table,tbody,thead,tfoot,th,tr,td,li,ol,ul,caption,blockquote,center,dl,dt,dd,dir,fieldset,noscript,menu,isindex,samp,header,footer,article,section,hgroup";l=d(l,",",d(l.toUpperCase()));h=a({Z:"H|K|N|O|P",Y:"X|form|R|Q",ZG:"E|span|width|align|char|charoff|valign",X:"p|T|div|U|W|isindex|fieldset|table",ZF:"E|align|char|charoff|valign",W:"pre|hr|blockquote|address|center|noframes",ZE:"abbr|axis|headers|scope|rowspan|colspan|align|char|charoff|valign|nowrap|bgcolor|width|height",ZD:"[E][S]",U:"ul|ol|dl|menu|dir",ZC:"p|Y|div|U|W|table|br|span|bdo|object|applet|img|map|K|N|Q",T:"h1|h2|h3|h4|h5|h6",ZB:"X|S|Q",S:"R|P",ZA:"a|G|J|M|O|P",R:"a|H|K|N|O",Q:"noscript|P",P:"ins|del|script",O:"input|select|textarea|label|button",N:"M|L",M:"em|strong|dfn|code|q|samp|kbd|var|cite|abbr|acronym",L:"sub|sup",K:"J|I",J:"tt|i|b|u|s|strike",I:"big|small|font|basefont",H:"G|F",G:"br|span|bdo",F:"object|applet|img|map|iframe",E:"A|B|C",D:"accesskey|tabindex|onfocus|onblur",C:"onclick|ondblclick|onmousedown|onmouseup|onmouseover|onmousemove|onmouseout|onkeypress|onkeydown|onkeyup",B:"lang|xml:lang|dir",A:"id|class|style|title"},"script[id|charset|type|language|src|defer|xml:space][]style[B|id|type|media|title|xml:space][]object[E|declare|classid|codebase|data|type|codetype|archive|standby|width|height|usemap|name|tabindex|align|border|hspace|vspace][#|param|Y]param[id|name|value|valuetype|type][]p[E|align][#|S]a[E|D|charset|type|name|href|hreflang|rel|rev|shape|coords|target][#|Z]br[A|clear][]span[E][#|S]bdo[A|C|B][#|S]applet[A|codebase|archive|code|object|alt|name|width|height|align|hspace|vspace][#|param|Y]h1[E|align][#|S]img[E|src|alt|name|longdesc|width|height|usemap|ismap|align|border|hspace|vspace][]map[B|C|A|name][X|form|Q|area]h2[E|align][#|S]iframe[A|longdesc|name|src|frameborder|marginwidth|marginheight|scrolling|align|width|height][#|Y]h3[E|align][#|S]tt[E][#|S]i[E][#|S]b[E][#|S]u[E][#|S]s[E][#|S]strike[E][#|S]big[E][#|S]small[E][#|S]font[A|B|size|color|face][#|S]basefont[id|size|color|face][]em[E][#|S]strong[E][#|S]dfn[E][#|S]code[E][#|S]q[E|cite][#|S]samp[E][#|S]kbd[E][#|S]var[E][#|S]cite[E][#|S]abbr[E][#|S]acronym[E][#|S]sub[E][#|S]sup[E][#|S]input[E|D|type|name|value|checked|disabled|readonly|size|maxlength|src|alt|usemap|onselect|onchange|accept|align][]select[E|name|size|multiple|disabled|tabindex|onfocus|onblur|onchange][optgroup|option]optgroup[E|disabled|label][option]option[E|selected|disabled|label|value][]textarea[E|D|name|rows|cols|disabled|readonly|onselect|onchange][]label[E|for|accesskey|onfocus|onblur][#|S]button[E|D|name|value|type|disabled][#|p|T|div|U|W|table|G|object|applet|img|map|K|N|Q]h4[E|align][#|S]ins[E|cite|datetime][#|Y]h5[E|align][#|S]del[E|cite|datetime][#|Y]h6[E|align][#|S]div[E|align][#|Y]ul[E|type|compact][li]li[E|type|value][#|Y]ol[E|type|compact|start][li]dl[E|compact][dt|dd]dt[E][#|S]dd[E][#|Y]menu[E|compact][li]dir[E|compact][li]pre[E|width|xml:space][#|ZA]hr[E|align|noshade|size|width][]blockquote[E|cite][#|Y]address[E][#|S|p]center[E][#|Y]noframes[E][#|Y]isindex[A|B|prompt][]fieldset[E][#|legend|Y]legend[E|accesskey|align][#|S]table[E|summary|width|border|frame|rules|cellspacing|cellpadding|align|bgcolor][caption|col|colgroup|thead|tfoot|tbody|tr]caption[E|align][#|S]col[ZG][]colgroup[ZG][col]thead[ZF][tr]tr[ZF|bgcolor][th|td]th[E|ZE][#|Y]form[E|action|method|name|enctype|onsubmit|onreset|accept|accept-charset|target][#|X|R|Q]noscript[E][#|Y]td[E|ZE][#|Y]tfoot[ZF][tr]tbody[ZF][tr]area[E|D|shape|coords|href|nohref|alt|target][]base[id|href|target][]body[E|onload|onunload|background|bgcolor|text|link|vlink|alink][#|Y]");j=d("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected,autoplay,loop,controls");g=d("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed,source");f=m.extend(d("td,th,iframe,video,audio,object"),g);b=d("pre,script,style,textarea");e=d("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");m.html.Schema=function(r){var A=this,n={},o={},y=[],q,p;r=r||{};if(r.verify_html===false){r.valid_elements="*[*]"}if(r.valid_styles){q={};k(r.valid_styles,function(C,B){q[B]=m.explode(C)})}p=r.whitespace_elements?d(r.whitespace_elements):b;function z(B){return new RegExp("^"+B.replace(/([?+*])/g,".$1")+"$")}function t(I){var H,D,W,S,X,C,F,R,U,N,V,Z,L,G,T,B,P,E,Y,aa,M,Q,K=/^([#+-])?([^\[\/]+)(?:\/([^\[]+))?(?:\[([^\]]+)\])?$/,O=/^([!\-])?(\w+::\w+|[^=:<]+)?(?:([=:<])(.*))?$/,J=/[*?+]/;if(I){I=i(I);if(n["@"]){P=n["@"].attributes;E=n["@"].attributesOrder}for(H=0,D=I.length;H<D;H++){C=K.exec(I[H]);if(C){T=C[1];N=C[2];B=C[3];U=C[4];L={};G=[];F={attributes:L,attributesOrder:G};if(T==="#"){F.paddEmpty=true}if(T==="-"){F.removeEmpty=true}if(P){for(aa in P){L[aa]=P[aa]}G.push.apply(G,E)}if(U){U=i(U,"|");for(W=0,S=U.length;W<S;W++){C=O.exec(U[W]);if(C){R={};Z=C[1];V=C[2].replace(/::/g,":");T=C[3];Q=C[4];if(Z==="!"){F.attributesRequired=F.attributesRequired||[];F.attributesRequired.push(V);R.required=true}if(Z==="-"){delete L[V];G.splice(m.inArray(G,V),1);continue}if(T){if(T==="="){F.attributesDefault=F.attributesDefault||[];F.attributesDefault.push({name:V,value:Q});R.defaultValue=Q}if(T===":"){F.attributesForced=F.attributesForced||[];F.attributesForced.push({name:V,value:Q});R.forcedValue=Q}if(T==="<"){R.validValues=d(Q,"?")}}if(J.test(V)){F.attributePatterns=F.attributePatterns||[];R.pattern=z(V);F.attributePatterns.push(R)}else{if(!L[V]){G.push(V)}L[V]=R}}}}if(!P&&N=="@"){P=L;E=G}if(B){F.outputName=N;n[B]=F}if(J.test(N)){F.pattern=z(N);y.push(F)}else{n[N]=F}}}}}function v(B){n={};y=[];t(B);k(h,function(D,C){o[C]=D.children})}function s(C){var B=/^(~)?(.+)$/;if(C){k(i(C),function(G){var E=B.exec(G),F=E[1]==="~",H=F?"span":"div",D=E[2];o[D]=o[H];c[D]=H;if(!F){l[D]={}}k(o,function(I,J){if(I[H]){I[D]=I[H]}})})}}function u(C){var B=/^([+\-]?)(\w+)\[([^\]]+)\]$/;if(C){k(i(C),function(G){var F=B.exec(G),D,E;if(F){E=F[1];if(E){D=o[F[2]]}else{D=o[F[2]]={"#comment":{}}}D=o[F[2]];k(i(F[3],"|"),function(H){if(E==="-"){delete D[H]}else{D[H]={}}})}})}}function x(B){var D=n[B],C;if(D){return D}C=y.length;while(C--){D=y[C];if(D.pattern.test(B)){return D}}}if(!r.valid_elements){k(h,function(C,B){n[B]={attributes:C.attributes,attributesOrder:C.attributesOrder};o[B]=C.children});k(i("strong/b,em/i"),function(B){B=i(B,"/");n[B[1]].outputName=B[0]});n.img.attributesDefault=[{name:"alt",value:""}];k(i("ol,ul,sub,sup,blockquote,span,font,a,table,tbody,tr"),function(B){n[B].removeEmpty=true});k(i("p,h1,h2,h3,h4,h5,h6,th,td,pre,div,address,caption"),function(B){n[B].paddEmpty=true})}else{v(r.valid_elements)}s(r.custom_elements);u(r.valid_children);t(r.extended_valid_elements);u("+ol[ul|ol],+ul[ul|ol]");if(!x("span")){t("span[!data-mce-type|*]")}if(r.invalid_elements){m.each(m.explode(r.invalid_elements),function(B){if(n[B]){delete n[B]}})}A.children=o;A.styles=q;A.getBoolAttrs=function(){return j};A.getBlockElements=function(){return l};A.getShortEndedElements=function(){return g};A.getSelfClosingElements=function(){return e};A.getNonEmptyElements=function(){return f};A.getWhiteSpaceElements=function(){return p};A.isValidChild=function(B,D){var C=o[B];return !!(C&&C[D])};A.getElementRule=x;A.getCustomElements=function(){return c};A.addValidElements=t;A.setValidElements=v;A.addCustomElements=s;A.addValidChildren=u};m.html.Schema.boolAttrMap=j;m.html.Schema.blockElementsMap=l})(tinymce);(function(a){a.html.SaxParser=function(c,e){var b=this,d=function(){};c=c||{};b.schema=e=e||new a.html.Schema();if(c.fix_self_closing!==false){c.fix_self_closing=true}a.each("comment cdata text start end pi doctype".split(" "),function(f){if(f){b[f]=c[f]||d}});b.parse=function(D){var n=this,g,F=0,H,A,z=[],M,P,B,q,y,r,L,G,N,u,m,k,s,Q,o,O,E,R,K,f,I,l,C,J,h,v=0,j=a.html.Entities.decode,x,p;function t(S){var U,T;U=z.length;while(U--){if(z[U].name===S){break}}if(U>=0){for(T=z.length-1;T>=U;T--){S=z[T];if(S.valid){n.end(S.name)}}z.length=U}}l=new RegExp("<(?:(?:!--([\\w\\W]*?)-->)|(?:!\\[CDATA\\[([\\w\\W]*?)\\]\\]>)|(?:!DOCTYPE([\\w\\W]*?)>)|(?:\\?([^\\s\\/<>]+) ?([\\w\\W]*?)[?/]>)|(?:\\/([^>]+)>)|(?:([^\\s\\/<>]+)\\s*((?:[^\"'>]+(?:(?:\"[^\"]*\")|(?:'[^']*')|[^>]*))*)>))","g");C=/([\w:\-]+)(?:\s*=\s*(?:(?:\"((?:\\.|[^\"])*)\")|(?:\'((?:\\.|[^\'])*)\')|([^>\s]+)))?/g;J={script:/<\/script[^>]*>/gi,style:/<\/style[^>]*>/gi,noscript:/<\/noscript[^>]*>/gi};L=e.getShortEndedElements();I=e.getSelfClosingElements();G=e.getBoolAttrs();u=c.validate;r=c.remove_internals;x=c.fix_self_closing;p=a.isIE;o=/^:/;while(g=l.exec(D)){if(F<g.index){n.text(j(D.substr(F,g.index-F)))}if(H=g[6]){H=H.toLowerCase();if(p&&o.test(H)){H=H.substr(1)}t(H)}else{if(H=g[7]){H=H.toLowerCase();if(p&&o.test(H)){H=H.substr(1)}N=H in L;if(x&&I[H]&&z.length>0&&z[z.length-1].name===H){t(H)}if(!u||(m=e.getElementRule(H))){k=true;if(u){O=m.attributes;E=m.attributePatterns}if(Q=g[8]){y=Q.indexOf("data-mce-type")!==-1;if(y&&r){k=false}M=[];M.map={};Q.replace(C,function(T,S,X,W,V){var Y,U;S=S.toLowerCase();X=S in G?S:j(X||W||V||"");if(u&&!y&&S.indexOf("data-")!==0){Y=O[S];if(!Y&&E){U=E.length;while(U--){Y=E[U];if(Y.pattern.test(S)){break}}if(U===-1){Y=null}}if(!Y){return}if(Y.validValues&&!(X in Y.validValues)){return}}M.map[S]=X;M.push({name:S,value:X})})}else{M=[];M.map={}}if(u&&!y){R=m.attributesRequired;K=m.attributesDefault;f=m.attributesForced;if(f){P=f.length;while(P--){s=f[P];q=s.name;h=s.value;if(h==="{$uid}"){h="mce_"+v++}M.map[q]=h;M.push({name:q,value:h})}}if(K){P=K.length;while(P--){s=K[P];q=s.name;if(!(q in M.map)){h=s.value;if(h==="{$uid}"){h="mce_"+v++}M.map[q]=h;M.push({name:q,value:h})}}}if(R){P=R.length;while(P--){if(R[P] in M.map){break}}if(P===-1){k=false}}if(M.map["data-mce-bogus"]){k=false}}if(k){n.start(H,M,N)}}else{k=false}if(A=J[H]){A.lastIndex=F=g.index+g[0].length;if(g=A.exec(D)){if(k){B=D.substr(F,g.index-F)}F=g.index+g[0].length}else{B=D.substr(F);F=D.length}if(k&&B.length>0){n.text(B,true)}if(k){n.end(H)}l.lastIndex=F;continue}if(!N){if(!Q||Q.indexOf("/")!=Q.length-1){z.push({name:H,valid:k})}else{if(k){n.end(H)}}}}else{if(H=g[1]){n.comment(H)}else{if(H=g[2]){n.cdata(H)}else{if(H=g[3]){n.doctype(H)}else{if(H=g[4]){n.pi(H,g[5])}}}}}}F=g.index+g[0].length}if(F<D.length){n.text(j(D.substr(F)))}for(P=z.length-1;P>=0;P--){H=z[P];if(H.valid){n.end(H.name)}}}}})(tinymce);(function(d){var c=/^[ \t\r\n]*$/,e={"#text":3,"#comment":8,"#cdata":4,"#pi":7,"#doctype":10,"#document-fragment":11};function a(k,l,j){var i,h,f=j?"lastChild":"firstChild",g=j?"prev":"next";if(k[f]){return k[f]}if(k!==l){i=k[g];if(i){return i}for(h=k.parent;h&&h!==l;h=h.parent){i=h[g];if(i){return i}}}}function b(f,g){this.name=f;this.type=g;if(g===1){this.attributes=[];this.attributes.map={}}}d.extend(b.prototype,{replace:function(g){var f=this;if(g.parent){g.remove()}f.insert(g,f);f.remove();return f},attr:function(h,l){var f=this,g,j,k;if(typeof h!=="string"){for(j in h){f.attr(j,h[j])}return f}if(g=f.attributes){if(l!==k){if(l===null){if(h in g.map){delete g.map[h];j=g.length;while(j--){if(g[j].name===h){g=g.splice(j,1);return f}}}return f}if(h in g.map){j=g.length;while(j--){if(g[j].name===h){g[j].value=l;break}}}else{g.push({name:h,value:l})}g.map[h]=l;return f}else{return g.map[h]}}},clone:function(){var g=this,n=new b(g.name,g.type),h,f,m,j,k;if(m=g.attributes){k=[];k.map={};for(h=0,f=m.length;h<f;h++){j=m[h];if(j.name!=="id"){k[k.length]={name:j.name,value:j.value};k.map[j.name]=j.value}}n.attributes=k}n.value=g.value;n.shortEnded=g.shortEnded;return n},wrap:function(g){var f=this;f.parent.insert(g,f);g.append(f);return f},unwrap:function(){var f=this,h,g;for(h=f.firstChild;h;){g=h.next;f.insert(h,f,true);h=g}f.remove()},remove:function(){var f=this,h=f.parent,g=f.next,i=f.prev;if(h){if(h.firstChild===f){h.firstChild=g;if(g){g.prev=null}}else{i.next=g}if(h.lastChild===f){h.lastChild=i;if(i){i.next=null}}else{g.prev=i}f.parent=f.next=f.prev=null}return f},append:function(h){var f=this,g;if(h.parent){h.remove()}g=f.lastChild;if(g){g.next=h;h.prev=g;f.lastChild=h}else{f.lastChild=f.firstChild=h}h.parent=f;return h},insert:function(h,f,i){var g;if(h.parent){h.remove()}g=f.parent||this;if(i){if(f===g.firstChild){g.firstChild=h}else{f.prev.next=h}h.prev=f.prev;h.next=f;f.prev=h}else{if(f===g.lastChild){g.lastChild=h}else{f.next.prev=h}h.next=f.next;h.prev=f;f.next=h}h.parent=g;return h},getAll:function(g){var f=this,h,i=[];for(h=f.firstChild;h;h=a(h,f)){if(h.name===g){i.push(h)}}return i},empty:function(){var g=this,f,h,j;if(g.firstChild){f=[];for(j=g.firstChild;j;j=a(j,g)){f.push(j)}h=f.length;while(h--){j=f[h];j.parent=j.firstChild=j.lastChild=j.next=j.prev=null}}g.firstChild=g.lastChild=null;return g},isEmpty:function(k){var f=this,j=f.firstChild,h,g;if(j){do{if(j.type===1){if(j.attributes.map["data-mce-bogus"]){continue}if(k[j.name]){return false}h=j.attributes.length;while(h--){g=j.attributes[h].name;if(g==="name"||g.indexOf("data-")===0){return false}}}if((j.type===3&&!c.test(j.value))){return false}}while(j=a(j,f))}return true},walk:function(f){return a(this,null,f)}});d.extend(b,{create:function(g,f){var i,h;i=new b(g,e[g]||1);if(f){for(h in f){i.attr(h,f[h])}}return i}});d.html.Node=b})(tinymce);(function(b){var a=b.html.Node;b.html.DomParser=function(g,h){var f=this,e={},d=[],i={},c={};g=g||{};g.validate="validate" in g?g.validate:true;g.root_name=g.root_name||"body";f.schema=h=h||new b.html.Schema();function j(m){var o,p,x,v,z,n,q,l,t,u,k,s,y,r;s=b.makeMap("tr,td,th,tbody,thead,tfoot,table");k=h.getNonEmptyElements();for(o=0;o<m.length;o++){p=m[o];if(!p.parent){continue}v=[p];for(x=p.parent;x&&!h.isValidChild(x.name,p.name)&&!s[x.name];x=x.parent){v.push(x)}if(x&&v.length>1){v.reverse();z=n=f.filterNode(v[0].clone());for(t=0;t<v.length-1;t++){if(h.isValidChild(n.name,v[t].name)){q=f.filterNode(v[t].clone());n.append(q)}else{q=n}for(l=v[t].firstChild;l&&l!=v[t+1];){r=l.next;q.append(l);l=r}n=q}if(!z.isEmpty(k)){x.insert(z,v[0],true);x.insert(p,z)}else{x.insert(p,v[0],true)}x=v[0];if(x.isEmpty(k)||x.firstChild===x.lastChild&&x.firstChild.name==="br"){x.empty().remove()}}else{if(p.parent){if(p.name==="li"){y=p.prev;if(y&&(y.name==="ul"||y.name==="ul")){y.append(p);continue}y=p.next;if(y&&(y.name==="ul"||y.name==="ul")){y.insert(p,y.firstChild,true);continue}p.wrap(f.filterNode(new a("ul",1)));continue}if(h.isValidChild(p.parent.name,"div")&&h.isValidChild("div",p.name)){p.wrap(f.filterNode(new a("div",1)))}else{if(p.name==="style"||p.name==="script"){p.empty().remove()}else{p.unwrap()}}}}}}f.filterNode=function(m){var l,k,n;if(k in e){n=i[k];if(n){n.push(m)}else{i[k]=[m]}}l=d.length;while(l--){k=d[l].name;if(k in m.attributes.map){n=c[k];if(n){n.push(m)}else{c[k]=[m]}}}return m};f.addNodeFilter=function(k,l){b.each(b.explode(k),function(m){var n=e[m];if(!n){e[m]=n=[]}n.push(l)})};f.addAttributeFilter=function(k,l){b.each(b.explode(k),function(m){var n;for(n=0;n<d.length;n++){if(d[n].name===m){d[n].callbacks.push(l);return}}d.push({name:m,callbacks:[l]})})};f.parse=function(v,m){var n,H,A,z,C,B,x,r,E,K,y,o,D,J=[],t,k,s,p,u,q;m=m||{};i={};c={};o=b.extend(b.makeMap("script,style,head,html,body,title,meta,param"),h.getBlockElements());u=h.getNonEmptyElements();p=h.children;y=g.validate;q="forced_root_block" in m?m.forced_root_block:g.forced_root_block;s=h.getWhiteSpaceElements();D=/^[ \t\r\n]+/;t=/[ \t\r\n]+$/;k=/[ \t\r\n]+/g;function F(){var L=H.firstChild,l,M;while(L){l=L.next;if(L.type==3||(L.type==1&&L.name!=="p"&&!o[L.name]&&!L.attr("data-mce-type"))){if(!M){M=I(q,1);H.insert(M,L);M.append(L)}else{M.append(L)}}else{M=null}L=l}}function I(l,L){var M=new a(l,L),N;if(l in e){N=i[l];if(N){N.push(M)}else{i[l]=[M]}}return M}function G(M){var N,l,L;for(N=M.prev;N&&N.type===3;){l=N.value.replace(t,"");if(l.length>0){N.value=l;N=N.prev}else{L=N.prev;N.remove();N=L}}}n=new b.html.SaxParser({validate:y,fix_self_closing:!y,cdata:function(l){A.append(I("#cdata",4)).value=l},text:function(M,l){var L;if(!s[A.name]){M=M.replace(k," ");if(A.lastChild&&o[A.lastChild.name]){M=M.replace(D,"")}}if(M.length!==0){L=I("#text",3);L.raw=!!l;A.append(L).value=M}},comment:function(l){A.append(I("#comment",8)).value=l},pi:function(l,L){A.append(I(l,7)).value=L;G(A)},doctype:function(L){var l;l=A.append(I("#doctype",10));l.value=L;G(A)},start:function(l,T,M){var R,O,N,L,P,U,S,Q;N=y?h.getElementRule(l):{};if(N){R=I(N.outputName||l,1);R.attributes=T;R.shortEnded=M;A.append(R);Q=p[A.name];if(Q&&p[R.name]&&!Q[R.name]){J.push(R)}O=d.length;while(O--){P=d[O].name;if(P in T.map){E=c[P];if(E){E.push(R)}else{c[P]=[R]}}}if(o[l]){G(R)}if(!M){A=R}}},end:function(l){var P,M,O,L,N;M=y?h.getElementRule(l):{};if(M){if(o[l]){if(!s[A.name]){for(P=A.firstChild;P&&P.type===3;){O=P.value.replace(D,"");if(O.length>0){P.value=O;P=P.next}else{L=P.next;P.remove();P=L}}for(P=A.lastChild;P&&P.type===3;){O=P.value.replace(t,"");if(O.length>0){P.value=O;P=P.prev}else{L=P.prev;P.remove();P=L}}}P=A.prev;if(P&&P.type===3){O=P.value.replace(D,"");if(O.length>0){P.value=O}else{P.remove()}}}if(M.removeEmpty||M.paddEmpty){if(A.isEmpty(u)){if(M.paddEmpty){A.empty().append(new a("#text","3")).value="\u00a0"}else{if(!A.attributes.map.name){N=A.parent;A.empty().remove();A=N;return}}}}A=A.parent}}},h);H=A=new a(m.context||g.root_name,11);n.parse(v);if(y&&J.length){if(!m.context){j(J)}else{m.invalid=true}}if(q&&H.name=="body"){F()}if(!m.invalid){for(K in i){E=e[K];z=i[K];x=z.length;while(x--){if(!z[x].parent){z.splice(x,1)}}for(C=0,B=E.length;C<B;C++){E[C](z,K,m)}}for(C=0,B=d.length;C<B;C++){E=d[C];if(E.name in c){z=c[E.name];x=z.length;while(x--){if(!z[x].parent){z.splice(x,1)}}for(x=0,r=E.callbacks.length;x<r;x++){E.callbacks[x](z,E.name,m)}}}}return H};if(g.remove_trailing_brs){f.addNodeFilter("br",function(n,m){var r,q=n.length,o,u=h.getBlockElements(),k=h.getNonEmptyElements(),s,p,t;u.body=1;for(r=0;r<q;r++){o=n[r];s=o.parent;if(u[o.parent.name]&&o===s.lastChild){p=o.prev;while(p){t=p.name;if(t!=="span"||p.attr("data-mce-type")!=="bookmark"){if(t!=="br"){break}if(t==="br"){o=null;break}}p=p.prev}if(o){o.remove();if(s.isEmpty(k)){elementRule=h.getElementRule(s.name);if(elementRule){if(elementRule.removeEmpty){s.remove()}else{if(elementRule.paddEmpty){s.empty().append(new b.html.Node("#text",3)).value="\u00a0"}}}}}}}})}}})(tinymce);tinymce.html.Writer=function(e){var c=[],a,b,d,f,g;e=e||{};a=e.indent;b=tinymce.makeMap(e.indent_before||"");d=tinymce.makeMap(e.indent_after||"");f=tinymce.html.Entities.getEncodeFunc(e.entity_encoding||"raw",e.entities);g=e.element_format=="html";return{start:function(m,k,p){var n,j,h,o;if(a&&b[m]&&c.length>0){o=c[c.length-1];if(o.length>0&&o!=="\n"){c.push("\n")}}c.push("<",m);if(k){for(n=0,j=k.length;n<j;n++){h=k[n];c.push(" ",h.name,'="',f(h.value,true),'"')}}if(!p||g){c[c.length]=">"}else{c[c.length]=" />"}if(p&&a&&d[m]&&c.length>0){o=c[c.length-1];if(o.length>0&&o!=="\n"){c.push("\n")}}},end:function(h){var i;c.push("</",h,">");if(a&&d[h]&&c.length>0){i=c[c.length-1];if(i.length>0&&i!=="\n"){c.push("\n")}}},text:function(i,h){if(i.length>0){c[c.length]=h?i:f(i)}},cdata:function(h){c.push("<![CDATA[",h,"]]>")},comment:function(h){c.push("<!--",h,"-->")},pi:function(h,i){if(i){c.push("<?",h," ",i,"?>")}else{c.push("<?",h,"?>")}if(a){c.push("\n")}},doctype:function(h){c.push("<!DOCTYPE",h,">",a?"\n":"")},reset:function(){c.length=0},getContent:function(){return c.join("").replace(/\n$/,"")}}};(function(a){a.html.Serializer=function(c,d){var b=this,e=new a.html.Writer(c);c=c||{};c.validate="validate" in c?c.validate:true;b.schema=d=d||new a.html.Schema();b.writer=e;b.serialize=function(h){var g,i;i=c.validate;g={3:function(k,j){e.text(k.value,k.raw)},8:function(j){e.comment(j.value)},7:function(j){e.pi(j.name,j.value)},10:function(j){e.doctype(j.value)},4:function(j){e.cdata(j.value)},11:function(j){if((j=j.firstChild)){do{f(j)}while(j=j.next)}}};e.reset();function f(k){var t=g[k.type],j,o,s,r,p,u,n,m,q;if(!t){j=k.name;o=k.shortEnded;s=k.attributes;if(i&&s&&s.length>1){u=[];u.map={};q=d.getElementRule(k.name);for(n=0,m=q.attributesOrder.length;n<m;n++){r=q.attributesOrder[n];if(r in s.map){p=s.map[r];u.map[r]=p;u.push({name:r,value:p})}}for(n=0,m=s.length;n<m;n++){r=s[n].name;if(!(r in u.map)){p=s.map[r];u.map[r]=p;u.push({name:r,value:p})}}s=u}e.start(k.name,s,o);if(!o){if((k=k.firstChild)){do{f(k)}while(k=k.next)}e.end(j)}}else{t(k)}}if(h.type==1&&!c.inner){f(h)}else{g[11](h)}return e.getContent()}}})(tinymce);(function(h){var f=h.each,e=h.is,d=h.isWebKit,b=h.isIE,c=h.html.Entities,a=/^([a-z0-9],?)+$/i,g=h.html.Schema.blockElementsMap,i=/^[ \t\r\n]*$/;h.create("tinymce.dom.DOMUtils",{doc:null,root:null,files:null,pixelStyles:/^(top|left|bottom|right|width|height|borderWidth)$/,props:{"for":"htmlFor","class":"className",className:"className",checked:"checked",disabled:"disabled",maxlength:"maxLength",readonly:"readOnly",selected:"selected",value:"value",id:"id",name:"name",type:"type"},DOMUtils:function(o,m){var l=this,j,k;l.doc=o;l.win=window;l.files={};l.cssFlicker=false;l.counter=0;l.stdMode=!h.isIE||o.documentMode>=8;l.boxModel=!h.isIE||o.compatMode=="CSS1Compat"||l.stdMode;l.hasOuterHTML="outerHTML" in o.createElement("a");l.settings=m=h.extend({keep_values:false,hex_colors:1},m);l.schema=m.schema;l.styles=new h.html.Styles({url_converter:m.url_converter,url_converter_scope:m.url_converter_scope},m.schema);if(h.isIE6){try{o.execCommand("BackgroundImageCache",false,true)}catch(n){l.cssFlicker=true}}if(b&&m.schema){("abbr article aside audio canvas details figcaption figure footer header hgroup mark menu meter nav output progress section summary time video").replace(/\w+/g,function(p){o.createElement(p)});for(k in m.schema.getCustomElements()){o.createElement(k)}}h.addUnload(l.destroy,l)},getRoot:function(){var j=this,k=j.settings;return(k&&j.get(k.root_element))||j.doc.body},getViewPort:function(k){var l,j;k=!k?this.win:k;l=k.document;j=this.boxModel?l.documentElement:l.body;return{x:k.pageXOffset||j.scrollLeft,y:k.pageYOffset||j.scrollTop,w:k.innerWidth||j.clientWidth,h:k.innerHeight||j.clientHeight}},getRect:function(m){var l,j=this,k;m=j.get(m);l=j.getPos(m);k=j.getSize(m);return{x:l.x,y:l.y,w:k.w,h:k.h}},getSize:function(m){var k=this,j,l;m=k.get(m);j=k.getStyle(m,"width");l=k.getStyle(m,"height");if(j.indexOf("px")===-1){j=0}if(l.indexOf("px")===-1){l=0}return{w:parseInt(j)||m.offsetWidth||m.clientWidth,h:parseInt(l)||m.offsetHeight||m.clientHeight}},getParent:function(l,k,j){return this.getParents(l,k,j,false)},getParents:function(u,p,l,s){var k=this,j,m=k.settings,q=[];u=k.get(u);s=s===undefined;if(m.strict_root){l=l||k.getRoot()}if(e(p,"string")){j=p;if(p==="*"){p=function(o){return o.nodeType==1}}else{p=function(o){return k.is(o,j)}}}while(u){if(u==l||!u.nodeType||u.nodeType===9){break}if(!p||p(u)){if(s){q.push(u)}else{return u}}u=u.parentNode}return s?q:null},get:function(j){var k;if(j&&this.doc&&typeof(j)=="string"){k=j;j=this.doc.getElementById(j);if(j&&j.id!==k){return this.doc.getElementsByName(k)[1]}}return j},getNext:function(k,j){return this._findSib(k,j,"nextSibling")},getPrev:function(k,j){return this._findSib(k,j,"previousSibling")},add:function(m,q,j,l,o){var k=this;return this.run(m,function(s){var r,n;r=e(q,"string")?k.doc.createElement(q):q;k.setAttribs(r,j);if(l){if(l.nodeType){r.appendChild(l)}else{k.setHTML(r,l)}}return !o?s.appendChild(r):r})},create:function(l,j,k){return this.add(this.doc.createElement(l),l,j,k,1)},createHTML:function(r,j,p){var q="",m=this,l;q+="<"+r;for(l in j){if(j.hasOwnProperty(l)){q+=" "+l+'="'+m.encode(j[l])+'"'}}if(typeof(p)!="undefined"){return q+">"+p+"</"+r+">"}return q+" />"},remove:function(j,k){return this.run(j,function(m){var n,l=m.parentNode;if(!l){return null}if(k){while(n=m.firstChild){if(!h.isIE||n.nodeType!==3||n.nodeValue){l.insertBefore(n,m)}else{m.removeChild(n)}}}return l.removeChild(m)})},setStyle:function(m,j,k){var l=this;return l.run(m,function(p){var o,n;o=p.style;j=j.replace(/-(\D)/g,function(r,q){return q.toUpperCase()});if(l.pixelStyles.test(j)&&(h.is(k,"number")||/^[\-0-9\.]+$/.test(k))){k+="px"}switch(j){case"opacity":if(b){o.filter=k===""?"":"alpha(opacity="+(k*100)+")";if(!m.currentStyle||!m.currentStyle.hasLayout){o.display="inline-block"}}o[j]=o["-moz-opacity"]=o["-khtml-opacity"]=k||"";break;case"float":b?o.styleFloat=k:o.cssFloat=k;break;default:o[j]=k||""}if(l.settings.update_styles){l.setAttrib(p,"data-mce-style")}})},getStyle:function(m,j,l){m=this.get(m);if(!m){return}if(this.doc.defaultView&&l){j=j.replace(/[A-Z]/g,function(n){return"-"+n});try{return this.doc.defaultView.getComputedStyle(m,null).getPropertyValue(j)}catch(k){return null}}j=j.replace(/-(\D)/g,function(o,n){return n.toUpperCase()});if(j=="float"){j=b?"styleFloat":"cssFloat"}if(m.currentStyle&&l){return m.currentStyle[j]}return m.style?m.style[j]:undefined},setStyles:function(m,n){var k=this,l=k.settings,j;j=l.update_styles;l.update_styles=0;f(n,function(o,p){k.setStyle(m,p,o)});l.update_styles=j;if(l.update_styles){k.setAttrib(m,l.cssText)}},removeAllAttribs:function(j){return this.run(j,function(m){var l,k=m.attributes;for(l=k.length-1;l>=0;l--){m.removeAttributeNode(k.item(l))}})},setAttrib:function(l,m,j){var k=this;if(!l||!m){return}if(k.settings.strict){m=m.toLowerCase()}return this.run(l,function(o){var n=k.settings;switch(m){case"style":if(!e(j,"string")){f(j,function(p,q){k.setStyle(o,q,p)});return}if(n.keep_values){if(j&&!k._isRes(j)){o.setAttribute("data-mce-style",j,2)}else{o.removeAttribute("data-mce-style",2)}}o.style.cssText=j;break;case"class":o.className=j||"";break;case"src":case"href":if(n.keep_values){if(n.url_converter){j=n.url_converter.call(n.url_converter_scope||k,j,m,o)}k.setAttrib(o,"data-mce-"+m,j,2)}break;case"shape":o.setAttribute("data-mce-style",j);break}if(e(j)&&j!==null&&j.length!==0){o.setAttribute(m,""+j,2)}else{o.removeAttribute(m,2)}})},setAttribs:function(k,l){var j=this;return this.run(k,function(m){f(l,function(o,p){j.setAttrib(m,p,o)})})},getAttrib:function(o,p,l){var j,k=this,m;o=k.get(o);if(!o||o.nodeType!==1){return l===m?false:l}if(!e(l)){l=""}if(/^(src|href|style|coords|shape)$/.test(p)){j=o.getAttribute("data-mce-"+p);if(j){return j}}if(b&&k.props[p]){j=o[k.props[p]];j=j&&j.nodeValue?j.nodeValue:j}if(!j){j=o.getAttribute(p,2)}if(/^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noshade|nowrap|readonly|selected)$/.test(p)){if(o[k.props[p]]===true&&j===""){return p}return j?p:""}if(o.nodeName==="FORM"&&o.getAttributeNode(p)){return o.getAttributeNode(p).nodeValue}if(p==="style"){j=j||o.style.cssText;if(j){j=k.serializeStyle(k.parseStyle(j),o.nodeName);if(k.settings.keep_values&&!k._isRes(j)){o.setAttribute("data-mce-style",j)}}}if(d&&p==="class"&&j){j=j.replace(/(apple|webkit)\-[a-z\-]+/gi,"")}if(b){switch(p){case"rowspan":case"colspan":if(j===1){j=""}break;case"size":if(j==="+0"||j===20||j===0){j=""}break;case"width":case"height":case"vspace":case"checked":case"disabled":case"readonly":if(j===0){j=""}break;case"hspace":if(j===-1){j=""}break;case"maxlength":case"tabindex":if(j===32768||j===2147483647||j==="32768"){j=""}break;case"multiple":case"compact":case"noshade":case"nowrap":if(j===65535){return p}return l;case"shape":j=j.toLowerCase();break;default:if(p.indexOf("on")===0&&j){j=h._replace(/^function\s+\w+\(\)\s+\{\s+(.*)\s+\}$/,"$1",""+j)}}}return(j!==m&&j!==null&&j!=="")?""+j:l},getPos:function(s,m){var k=this,j=0,q=0,o,p=k.doc,l;s=k.get(s);m=m||p.body;if(s){if(s.getBoundingClientRect){s=s.getBoundingClientRect();o=k.boxModel?p.documentElement:p.body;j=s.left+(p.documentElement.scrollLeft||p.body.scrollLeft)-o.clientTop;q=s.top+(p.documentElement.scrollTop||p.body.scrollTop)-o.clientLeft;return{x:j,y:q}}l=s;while(l&&l!=m&&l.nodeType){j+=l.offsetLeft||0;q+=l.offsetTop||0;l=l.offsetParent}l=s.parentNode;while(l&&l!=m&&l.nodeType){j-=l.scrollLeft||0;q-=l.scrollTop||0;l=l.parentNode}}return{x:j,y:q}},parseStyle:function(j){return this.styles.parse(j)},serializeStyle:function(k,j){return this.styles.serialize(k,j)},loadCSS:function(j){var l=this,m=l.doc,k;if(!j){j=""}k=l.select("head")[0];f(j.split(","),function(n){var o;if(l.files[n]){return}l.files[n]=true;o=l.create("link",{rel:"stylesheet",href:h._addVer(n)});if(b&&m.documentMode&&m.recalc){o.onload=function(){if(m.recalc){m.recalc()}o.onload=null}}k.appendChild(o)})},addClass:function(j,k){return this.run(j,function(l){var m;if(!k){return 0}if(this.hasClass(l,k)){return l.className}m=this.removeClass(l,k);return l.className=(m!=""?(m+" "):"")+k})},removeClass:function(l,m){var j=this,k;return j.run(l,function(o){var n;if(j.hasClass(o,m)){if(!k){k=new RegExp("(^|\\s+)"+m+"(\\s+|$)","g")}n=o.className.replace(k," ");n=h.trim(n!=" "?n:"");o.className=n;if(!n){o.removeAttribute("class");o.removeAttribute("className")}return n}return o.className})},hasClass:function(k,j){k=this.get(k);if(!k||!j){return false}return(" "+k.className+" ").indexOf(" "+j+" ")!==-1},show:function(j){return this.setStyle(j,"display","block")},hide:function(j){return this.setStyle(j,"display","none")},isHidden:function(j){j=this.get(j);return !j||j.style.display=="none"||this.getStyle(j,"display")=="none"},uniqueId:function(j){return(!j?"mce_":j)+(this.counter++)},setHTML:function(l,k){var j=this;return j.run(l,function(n){if(b){while(n.firstChild){n.removeChild(n.firstChild)}try{n.innerHTML="<br />"+k;n.removeChild(n.firstChild)}catch(m){n=j.create("div");n.innerHTML="<br />"+k;f(n.childNodes,function(p,o){if(o){n.appendChild(p)}})}}else{n.innerHTML=k}return k})},getOuterHTML:function(l){var k,j=this;l=j.get(l);if(!l){return null}if(l.nodeType===1&&j.hasOuterHTML){return l.outerHTML}k=(l.ownerDocument||j.doc).createElement("body");k.appendChild(l.cloneNode(true));return k.innerHTML},setOuterHTML:function(m,k,n){var j=this;function l(p,o,r){var s,q;q=r.createElement("body");q.innerHTML=o;s=q.lastChild;while(s){j.insertAfter(s.cloneNode(true),p);s=s.previousSibling}j.remove(p)}return this.run(m,function(p){p=j.get(p);if(p.nodeType==1){n=n||p.ownerDocument||j.doc;if(b){try{if(b&&p.nodeType==1){p.outerHTML=k}else{l(p,k,n)}}catch(o){l(p,k,n)}}else{l(p,k,n)}}})},decode:c.decode,encode:c.encodeAllRaw,insertAfter:function(j,k){k=this.get(k);return this.run(j,function(m){var l,n;l=k.parentNode;n=k.nextSibling;if(n){l.insertBefore(m,n)}else{l.appendChild(m)}return m})},isBlock:function(k){var j=k.nodeType;if(j){return !!(j===1&&g[k.nodeName])}return !!g[k]},replace:function(p,m,j){var l=this;if(e(m,"array")){p=p.cloneNode(true)}return l.run(m,function(k){if(j){f(h.grep(k.childNodes),function(n){p.appendChild(n)})}return k.parentNode.replaceChild(p,k)})},rename:function(m,j){var l=this,k;if(m.nodeName!=j.toUpperCase()){k=l.create(j);f(l.getAttribs(m),function(n){l.setAttrib(k,n.nodeName,l.getAttrib(m,n.nodeName))});l.replace(k,m,1)}return k||m},findCommonAncestor:function(l,j){var m=l,k;while(m){k=j;while(k&&m!=k){k=k.parentNode}if(m==k){break}m=m.parentNode}if(!m&&l.ownerDocument){return l.ownerDocument.documentElement}return m},toHex:function(j){var l=/^\s*rgb\s*?\(\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?\)\s*$/i.exec(j);function k(m){m=parseInt(m).toString(16);return m.length>1?m:"0"+m}if(l){j="#"+k(l[1])+k(l[2])+k(l[3]);return j}return j},getClasses:function(){var n=this,j=[],m,o={},p=n.settings.class_filter,l;if(n.classes){return n.classes}function q(r){f(r.imports,function(s){q(s)});f(r.cssRules||r.rules,function(s){switch(s.type||1){case 1:if(s.selectorText){f(s.selectorText.split(","),function(t){t=t.replace(/^\s*|\s*$|^\s\./g,"");if(/\.mce/.test(t)||!/\.[\w\-]+$/.test(t)){return}l=t;t=h._replace(/.*\.([a-z0-9_\-]+).*/i,"$1",t);if(p&&!(t=p(t,l))){return}if(!o[t]){j.push({"class":t});o[t]=1}})}break;case 3:q(s.styleSheet);break}})}try{f(n.doc.styleSheets,q)}catch(k){}if(j.length>0){n.classes=j}return j},run:function(m,l,k){var j=this,n;if(j.doc&&typeof(m)==="string"){m=j.get(m)}if(!m){return false}k=k||this;if(!m.nodeType&&(m.length||m.length===0)){n=[];f(m,function(p,o){if(p){if(typeof(p)=="string"){p=j.doc.getElementById(p)}n.push(l.call(k,p,o))}});return n}return l.call(k,m)},getAttribs:function(k){var j;k=this.get(k);if(!k){return[]}if(b){j=[];if(k.nodeName=="OBJECT"){return k.attributes}if(k.nodeName==="OPTION"&&this.getAttrib(k,"selected")){j.push({specified:1,nodeName:"selected"})}k.cloneNode(false).outerHTML.replace(/<\/?[\w:\-]+ ?|=[\"][^\"]+\"|=\'[^\']+\'|=[\w\-]+|>/gi,"").replace(/[\w:\-]+/gi,function(l){j.push({specified:1,nodeName:l})});return j}return k.attributes},isEmpty:function(m,k){var r=this,o,n,q,j,l,p;m=m.firstChild;if(m){j=new h.dom.TreeWalker(m);k=k||r.schema?r.schema.getNonEmptyElements():null;do{q=m.nodeType;if(q===1){if(m.getAttribute("data-mce-bogus")){continue}l=m.nodeName.toLowerCase();if(k&&k[l]){p=m.parentNode;if(l==="br"&&r.isBlock(p)&&p.firstChild===m&&p.lastChild===m){continue}return false}n=r.getAttribs(m);o=m.attributes.length;while(o--){l=m.attributes[o].nodeName;if(l==="name"||l==="data-mce-bookmark"){return false}}}if((q===3&&!i.test(m.nodeValue))){return false}}while(m=j.next())}return true},destroy:function(k){var j=this;if(j.events){j.events.destroy()}j.win=j.doc=j.root=j.events=null;if(!k){h.removeUnload(j.destroy)}},createRng:function(){var j=this.doc;return j.createRange?j.createRange():new h.dom.Range(this)},nodeIndex:function(n,o){var j=0,l,m,k;if(n){for(l=n.nodeType,n=n.previousSibling,m=n;n;n=n.previousSibling){k=n.nodeType;if(o&&k==3){if(k==l||!n.nodeValue.length){continue}}j++;l=k}}return j},split:function(n,m,q){var s=this,j=s.createRng(),o,l,p;function k(v){var t,r=v.childNodes,u=v.nodeType;if(u==1&&v.getAttribute("data-mce-type")=="bookmark"){return}for(t=r.length-1;t>=0;t--){k(r[t])}if(u!=9){if(u==3&&v.nodeValue.length>0){if(!s.isBlock(v.parentNode)||h.trim(v.nodeValue).length>0){return}}else{if(u==1){r=v.childNodes;if(r.length==1&&r[0]&&r[0].nodeType==1&&r[0].getAttribute("data-mce-type")=="bookmark"){v.parentNode.insertBefore(r[0],v)}if(r.length||/^(br|hr|input|img)$/i.test(v.nodeName)){return}}}s.remove(v)}return v}if(n&&m){j.setStart(n.parentNode,s.nodeIndex(n));j.setEnd(m.parentNode,s.nodeIndex(m));o=j.extractContents();j=s.createRng();j.setStart(m.parentNode,s.nodeIndex(m)+1);j.setEnd(n.parentNode,s.nodeIndex(n)+1);l=j.extractContents();p=n.parentNode;p.insertBefore(k(o),n);if(q){p.replaceChild(q,m)}else{p.insertBefore(m,n)}p.insertBefore(k(l),n);s.remove(n);return q||m}},bind:function(n,j,m,l){var k=this;if(!k.events){k.events=new h.dom.EventUtils()}return k.events.add(n,j,m,l||this)},unbind:function(m,j,l){var k=this;if(!k.events){k.events=new h.dom.EventUtils()}return k.events.remove(m,j,l)},_findSib:function(m,j,k){var l=this,n=j;if(m){if(e(n,"string")){n=function(o){return l.is(o,j)}}for(m=m[k];m;m=m[k]){if(n(m)){return m}}}return null},_isRes:function(j){return/^(top|left|bottom|right|width|height)/i.test(j)||/;\s*(top|left|bottom|right|width|height)/i.test(j)}});h.DOM=new h.dom.DOMUtils(document,{process_html:0})})(tinymce);(function(a){function b(c){var N=this,e=c.doc,S=0,E=1,j=2,D=true,R=false,U="startOffset",h="startContainer",P="endContainer",z="endOffset",k=tinymce.extend,n=c.nodeIndex;k(N,{startContainer:e,startOffset:0,endContainer:e,endOffset:0,collapsed:D,commonAncestorContainer:e,START_TO_START:0,START_TO_END:1,END_TO_END:2,END_TO_START:3,setStart:q,setEnd:s,setStartBefore:g,setStartAfter:I,setEndBefore:J,setEndAfter:u,collapse:A,selectNode:x,selectNodeContents:F,compareBoundaryPoints:v,deleteContents:p,extractContents:H,cloneContents:d,insertNode:C,surroundContents:M,cloneRange:K});function q(V,t){B(D,V,t)}function s(V,t){B(R,V,t)}function g(t){q(t.parentNode,n(t))}function I(t){q(t.parentNode,n(t)+1)}function J(t){s(t.parentNode,n(t))}function u(t){s(t.parentNode,n(t)+1)}function A(t){if(t){N[P]=N[h];N[z]=N[U]}else{N[h]=N[P];N[U]=N[z]}N.collapsed=D}function x(t){g(t);u(t)}function F(t){q(t,0);s(t,t.nodeType===1?t.childNodes.length:t.nodeValue.length)}function v(Y,t){var ab=N[h],W=N[U],aa=N[P],V=N[z],Z=t.startContainer,ad=t.startOffset,X=t.endContainer,ac=t.endOffset;if(Y===0){return G(ab,W,Z,ad)}if(Y===1){return G(aa,V,Z,ad)}if(Y===2){return G(aa,V,X,ac)}if(Y===3){return G(ab,W,X,ac)}}function p(){m(j)}function H(){return m(S)}function d(){return m(E)}function C(Y){var V=this[h],t=this[U],X,W;if((V.nodeType===3||V.nodeType===4)&&V.nodeValue){if(!t){V.parentNode.insertBefore(Y,V)}else{if(t>=V.nodeValue.length){c.insertAfter(Y,V)}else{X=V.splitText(t);V.parentNode.insertBefore(Y,X)}}}else{if(V.childNodes.length>0){W=V.childNodes[t]}if(W){V.insertBefore(Y,W)}else{V.appendChild(Y)}}}function M(V){var t=N.extractContents();N.insertNode(V);V.appendChild(t);N.selectNode(V)}function K(){return k(new b(c),{startContainer:N[h],startOffset:N[U],endContainer:N[P],endOffset:N[z],collapsed:N.collapsed,commonAncestorContainer:N.commonAncestorContainer})}function O(t,V){var W;if(t.nodeType==3){return t}if(V<0){return t}W=t.firstChild;while(W&&V>0){--V;W=W.nextSibling}if(W){return W}return t}function l(){return(N[h]==N[P]&&N[U]==N[z])}function G(X,Z,V,Y){var aa,W,t,ab,ad,ac;if(X==V){if(Z==Y){return 0}if(Z<Y){return -1}return 1}aa=V;while(aa&&aa.parentNode!=X){aa=aa.parentNode}if(aa){W=0;t=X.firstChild;while(t!=aa&&W<Z){W++;t=t.nextSibling}if(Z<=W){return -1}return 1}aa=X;while(aa&&aa.parentNode!=V){aa=aa.parentNode}if(aa){W=0;t=V.firstChild;while(t!=aa&&W<Y){W++;t=t.nextSibling}if(W<Y){return -1}return 1}ab=c.findCommonAncestor(X,V);ad=X;while(ad&&ad.parentNode!=ab){ad=ad.parentNode}if(!ad){ad=ab}ac=V;while(ac&&ac.parentNode!=ab){ac=ac.parentNode}if(!ac){ac=ab}if(ad==ac){return 0}t=ab.firstChild;while(t){if(t==ad){return -1}if(t==ac){return 1}t=t.nextSibling}}function B(V,Y,X){var t,W;if(V){N[h]=Y;N[U]=X}else{N[P]=Y;N[z]=X}t=N[P];while(t.parentNode){t=t.parentNode}W=N[h];while(W.parentNode){W=W.parentNode}if(W==t){if(G(N[h],N[U],N[P],N[z])>0){N.collapse(V)}}else{N.collapse(V)}N.collapsed=l();N.commonAncestorContainer=c.findCommonAncestor(N[h],N[P])}function m(ab){var aa,X=0,ad=0,V,Z,W,Y,t,ac;if(N[h]==N[P]){return f(ab)}for(aa=N[P],V=aa.parentNode;V;aa=V,V=V.parentNode){if(V==N[h]){return r(aa,ab)}++X}for(aa=N[h],V=aa.parentNode;V;aa=V,V=V.parentNode){if(V==N[P]){return T(aa,ab)}++ad}Z=ad-X;W=N[h];while(Z>0){W=W.parentNode;Z--}Y=N[P];while(Z<0){Y=Y.parentNode;Z++}for(t=W.parentNode,ac=Y.parentNode;t!=ac;t=t.parentNode,ac=ac.parentNode){W=t;Y=ac}return o(W,Y,ab)}function f(Z){var ab,Y,X,aa,t,W,V;if(Z!=j){ab=e.createDocumentFragment()}if(N[U]==N[z]){return ab}if(N[h].nodeType==3){Y=N[h].nodeValue;X=Y.substring(N[U],N[z]);if(Z!=E){N[h].deleteData(N[U],N[z]-N[U]);N.collapse(D)}if(Z==j){return}ab.appendChild(e.createTextNode(X));return ab}aa=O(N[h],N[U]);t=N[z]-N[U];while(t>0){W=aa.nextSibling;V=y(aa,Z);if(ab){ab.appendChild(V)}--t;aa=W}if(Z!=E){N.collapse(D)}return ab}function r(ab,Y){var aa,Z,V,t,X,W;if(Y!=j){aa=e.createDocumentFragment()}Z=i(ab,Y);if(aa){aa.appendChild(Z)}V=n(ab);t=V-N[U];if(t<=0){if(Y!=E){N.setEndBefore(ab);N.collapse(R)}return aa}Z=ab.previousSibling;while(t>0){X=Z.previousSibling;W=y(Z,Y);if(aa){aa.insertBefore(W,aa.firstChild)}--t;Z=X}if(Y!=E){N.setEndBefore(ab);N.collapse(R)}return aa}function T(Z,Y){var ab,V,aa,t,X,W;if(Y!=j){ab=e.createDocumentFragment()}aa=Q(Z,Y);if(ab){ab.appendChild(aa)}V=n(Z);++V;t=N[z]-V;aa=Z.nextSibling;while(t>0){X=aa.nextSibling;W=y(aa,Y);if(ab){ab.appendChild(W)}--t;aa=X}if(Y!=E){N.setStartAfter(Z);N.collapse(D)}return ab}function o(Z,t,ac){var W,ae,Y,aa,ab,V,ad,X;if(ac!=j){ae=e.createDocumentFragment()}W=Q(Z,ac);if(ae){ae.appendChild(W)}Y=Z.parentNode;aa=n(Z);ab=n(t);++aa;V=ab-aa;ad=Z.nextSibling;while(V>0){X=ad.nextSibling;W=y(ad,ac);if(ae){ae.appendChild(W)}ad=X;--V}W=i(t,ac);if(ae){ae.appendChild(W)}if(ac!=E){N.setStartAfter(Z);N.collapse(D)}return ae}function i(aa,ab){var W=O(N[P],N[z]-1),ac,Z,Y,t,V,X=W!=N[P];if(W==aa){return L(W,X,R,ab)}ac=W.parentNode;Z=L(ac,R,R,ab);while(ac){while(W){Y=W.previousSibling;t=L(W,X,R,ab);if(ab!=j){Z.insertBefore(t,Z.firstChild)}X=D;W=Y}if(ac==aa){return Z}W=ac.previousSibling;ac=ac.parentNode;V=L(ac,R,R,ab);if(ab!=j){V.appendChild(Z)}Z=V}}function Q(aa,ab){var X=O(N[h],N[U]),Y=X!=N[h],ac,Z,W,t,V;if(X==aa){return L(X,Y,D,ab)}ac=X.parentNode;Z=L(ac,R,D,ab);while(ac){while(X){W=X.nextSibling;t=L(X,Y,D,ab);if(ab!=j){Z.appendChild(t)}Y=D;X=W}if(ac==aa){return Z}X=ac.nextSibling;ac=ac.parentNode;V=L(ac,R,D,ab);if(ab!=j){V.appendChild(Z)}Z=V}}function L(t,Y,ab,ac){var X,W,Z,V,aa;if(Y){return y(t,ac)}if(t.nodeType==3){X=t.nodeValue;if(ab){V=N[U];W=X.substring(V);Z=X.substring(0,V)}else{V=N[z];W=X.substring(0,V);Z=X.substring(V)}if(ac!=E){t.nodeValue=Z}if(ac==j){return}aa=t.cloneNode(R);aa.nodeValue=W;return aa}if(ac==j){return}return t.cloneNode(R)}function y(V,t){if(t!=j){return t==E?V.cloneNode(D):V}V.parentNode.removeChild(V)}}a.Range=b})(tinymce.dom);(function(){function a(d){var b=this,h=d.dom,c=true,f=false;function e(i,j){var k,t=0,q,n,m,l,o,r,p=-1,s;k=i.duplicate();k.collapse(j);s=k.parentElement();if(s.ownerDocument!==d.dom.doc){return}while(s.contentEditable==="false"){s=s.parentNode}if(!s.hasChildNodes()){return{node:s,inside:1}}m=s.children;q=m.length-1;while(t<=q){r=Math.floor((t+q)/2);l=m[r];k.moveToElementText(l);p=k.compareEndPoints(j?"StartToStart":"EndToEnd",i);if(p>0){q=r-1}else{if(p<0){t=r+1}else{return{node:l}}}}if(p<0){if(!l){k.moveToElementText(s);k.collapse(true);l=s;n=true}else{k.collapse(false)}k.setEndPoint(j?"EndToStart":"EndToEnd",i);if(k.compareEndPoints(j?"StartToStart":"StartToEnd",i)>0){k=i.duplicate();k.collapse(j);o=-1;while(s==k.parentElement()){if(k.move("character",-1)==0){break}o++}}o=o||k.text.replace("\r\n"," ").length}else{k.collapse(true);k.setEndPoint(j?"StartToStart":"StartToEnd",i);o=k.text.replace("\r\n"," ").length}return{node:l,position:p,offset:o,inside:n}}function g(){var i=d.getRng(),r=h.createRng(),l,k,p,q,m,j;l=i.item?i.item(0):i.parentElement();if(l.ownerDocument!=h.doc){return r}k=d.isCollapsed();if(i.item){r.setStart(l.parentNode,h.nodeIndex(l));r.setEnd(r.startContainer,r.startOffset+1);return r}function o(A){var u=e(i,A),s,y,z=0,x,v,t;s=u.node;y=u.offset;if(u.inside&&!s.hasChildNodes()){r[A?"setStart":"setEnd"](s,0);return}if(y===v){r[A?"setStartBefore":"setEndAfter"](s);return}if(u.position<0){x=u.inside?s.firstChild:s.nextSibling;if(!x){r[A?"setStartAfter":"setEndAfter"](s);return}if(!y){if(x.nodeType==3){r[A?"setStart":"setEnd"](x,0)}else{r[A?"setStartBefore":"setEndBefore"](x)}return}while(x){t=x.nodeValue;z+=t.length;if(z>=y){s=x;z-=y;z=t.length-z;break}x=x.nextSibling}}else{x=s.previousSibling;if(!x){return r[A?"setStartBefore":"setEndBefore"](s)}if(!y){if(s.nodeType==3){r[A?"setStart":"setEnd"](x,s.nodeValue.length)}else{r[A?"setStartAfter":"setEndAfter"](x)}return}while(x){z+=x.nodeValue.length;if(z>=y){s=x;z-=y;break}x=x.previousSibling}}r[A?"setStart":"setEnd"](s,z)}try{o(true);if(!k){o()}}catch(n){if(n.number==-2147024809){m=b.getBookmark(2);p=i.duplicate();p.collapse(true);l=p.parentElement();if(!k){p=i.duplicate();p.collapse(false);q=p.parentElement();q.innerHTML=q.innerHTML}l.innerHTML=l.innerHTML;b.moveToBookmark(m);i=d.getRng();o(true);if(!k){o()}}else{throw n}}return r}this.getBookmark=function(m){var j=d.getRng(),o,i,l={};function n(u){var u,t,p,s,r,q=[];t=u.parentNode;p=h.getRoot().parentNode;while(t!=p){s=t.children;r=s.length;while(r--){if(u===s[r]){q.push(r);break}}u=t;t=t.parentNode}return q}function k(q){var p;p=e(j,q);if(p){return{position:p.position,offset:p.offset,indexes:n(p.node),inside:p.inside}}}if(m===2){if(!j.item){l.start=k(true);if(!d.isCollapsed()){l.end=k()}}else{l.start={ctrl:true,indexes:n(j.item(0))}}}return l};this.moveToBookmark=function(k){var j,i=h.doc.body;function m(o){var r,q,n,p;r=h.getRoot();for(q=o.length-1;q>=0;q--){p=r.children;n=o[q];if(n<=p.length-1){r=p[n]}}return r}function l(r){var n=k[r?"start":"end"],q,p,o;if(n){q=n.position>0;p=i.createTextRange();p.moveToElementText(m(n.indexes));offset=n.offset;if(offset!==o){p.collapse(n.inside||q);p.moveStart("character",q?-offset:offset)}else{p.collapse(r)}j.setEndPoint(r?"StartToStart":"EndToStart",p);if(r){j.collapse(true)}}}if(k.start){if(k.start.ctrl){j=i.createControlRange();j.addElement(m(k.start.indexes));j.select()}else{j=i.createTextRange();l(true);l();j.select()}}};this.addRange=function(i){var n,l,k,p,s,q,r=d.dom.doc,m=r.body;function j(z){var u,y,t,x,v;t=h.create("a");u=z?k:s;y=z?p:q;x=n.duplicate();if(u==r||u==r.documentElement){u=m;y=0}if(u.nodeType==3){u.parentNode.insertBefore(t,u);x.moveToElementText(t);x.moveStart("character",y);h.remove(t);n.setEndPoint(z?"StartToStart":"EndToEnd",x)}else{v=u.childNodes;if(v.length){if(y>=v.length){h.insertAfter(t,v[v.length-1])}else{u.insertBefore(t,v[y])}x.moveToElementText(t)}else{t=r.createTextNode("\uFEFF");u.appendChild(t);x.moveToElementText(t.parentNode);x.collapse(c)}n.setEndPoint(z?"StartToStart":"EndToEnd",x);h.remove(t)}}k=i.startContainer;p=i.startOffset;s=i.endContainer;q=i.endOffset;n=m.createTextRange();if(k==s&&k.nodeType==1&&p==q-1){if(p==q-1){try{l=m.createControlRange();l.addElement(k.childNodes[p]);l.select();return}catch(o){}}}j(true);j();n.select()};this.getRangeAt=g}tinymce.dom.TridentSelection=a})();(function(d){var f=d.each,c=d.DOM,b=d.isIE,e=d.isWebKit,a;d.create("tinymce.dom.EventUtils",{EventUtils:function(){this.inits=[];this.events=[]},add:function(m,p,l,j){var g,h=this,i=h.events,k;if(p instanceof Array){k=[];f(p,function(o){k.push(h.add(m,o,l,j))});return k}if(m&&m.hasOwnProperty&&m instanceof Array){k=[];f(m,function(n){n=c.get(n);k.push(h.add(n,p,l,j))});return k}m=c.get(m);if(!m){return}g=function(n){if(h.disabled){return}n=n||window.event;if(n&&b){if(!n.target){n.target=n.srcElement}d.extend(n,h._stoppers)}if(!j){return l(n)}return l.call(j,n)};if(p=="unload"){d.unloads.unshift({func:g});return g}if(p=="init"){if(h.domLoaded){g()}else{h.inits.push(g)}return g}i.push({obj:m,name:p,func:l,cfunc:g,scope:j});h._add(m,p,g);return l},remove:function(l,m,k){var h=this,g=h.events,i=false,j;if(l&&l.hasOwnProperty&&l instanceof Array){j=[];f(l,function(n){n=c.get(n);j.push(h.remove(n,m,k))});return j}l=c.get(l);f(g,function(o,n){if(o.obj==l&&o.name==m&&(!k||(o.func==k||o.cfunc==k))){g.splice(n,1);h._remove(l,m,o.cfunc);i=true;return false}});return i},clear:function(l){var j=this,g=j.events,h,k;if(l){l=c.get(l);for(h=g.length-1;h>=0;h--){k=g[h];if(k.obj===l){j._remove(k.obj,k.name,k.cfunc);k.obj=k.cfunc=null;g.splice(h,1)}}}},cancel:function(g){if(!g){return false}this.stop(g);return this.prevent(g)},stop:function(g){if(g.stopPropagation){g.stopPropagation()}else{g.cancelBubble=true}return false},prevent:function(g){if(g.preventDefault){g.preventDefault()}else{g.returnValue=false}return false},destroy:function(){var g=this;f(g.events,function(j,h){g._remove(j.obj,j.name,j.cfunc);j.obj=j.cfunc=null});g.events=[];g=null},_add:function(h,i,g){if(h.attachEvent){h.attachEvent("on"+i,g)}else{if(h.addEventListener){h.addEventListener(i,g,false)}else{h["on"+i]=g}}},_remove:function(i,j,h){if(i){try{if(i.detachEvent){i.detachEvent("on"+j,h)}else{if(i.removeEventListener){i.removeEventListener(j,h,false)}else{i["on"+j]=null}}}catch(g){}}},_pageInit:function(h){var g=this;if(g.domLoaded){return}g.domLoaded=true;f(g.inits,function(i){i()});g.inits=[]},_wait:function(i){var g=this,h=i.document;if(i.tinyMCE_GZ&&tinyMCE_GZ.loaded){g.domLoaded=1;return}if(h.attachEvent){h.attachEvent("onreadystatechange",function(){if(h.readyState==="complete"){h.detachEvent("onreadystatechange",arguments.callee);g._pageInit(i)}});if(h.documentElement.doScroll&&i==i.top){(function(){if(g.domLoaded){return}try{h.documentElement.doScroll("left")}catch(j){setTimeout(arguments.callee,0);return}g._pageInit(i)})()}}else{if(h.addEventListener){g._add(i,"DOMContentLoaded",function(){g._pageInit(i)})}}g._add(i,"load",function(){g._pageInit(i)})},_stoppers:{preventDefault:function(){this.returnValue=false},stopPropagation:function(){this.cancelBubble=true}}});a=d.dom.Event=new d.dom.EventUtils();a._wait(window);d.addUnload(function(){a.destroy()})})(tinymce);(function(a){a.dom.Element=function(f,d){var b=this,e,c;b.settings=d=d||{};b.id=f;b.dom=e=d.dom||a.DOM;if(!a.isIE){c=e.get(b.id)}a.each(("getPos,getRect,getParent,add,setStyle,getStyle,setStyles,setAttrib,setAttribs,getAttrib,addClass,removeClass,hasClass,getOuterHTML,setOuterHTML,remove,show,hide,isHidden,setHTML,get").split(/,/),function(g){b[g]=function(){var h=[f],j;for(j=0;j<arguments.length;j++){h.push(arguments[j])}h=e[g].apply(e,h);b.update(g);return h}});a.extend(b,{on:function(i,h,g){return a.dom.Event.add(b.id,i,h,g)},getXY:function(){return{x:parseInt(b.getStyle("left")),y:parseInt(b.getStyle("top"))}},getSize:function(){var g=e.get(b.id);return{w:parseInt(b.getStyle("width")||g.clientWidth),h:parseInt(b.getStyle("height")||g.clientHeight)}},moveTo:function(g,h){b.setStyles({left:g,top:h})},moveBy:function(g,i){var h=b.getXY();b.moveTo(h.x+g,h.y+i)},resizeTo:function(g,i){b.setStyles({width:g,height:i})},resizeBy:function(g,j){var i=b.getSize();b.resizeTo(i.w+g,i.h+j)},update:function(h){var g;if(a.isIE6&&d.blocker){h=h||"";if(h.indexOf("get")===0||h.indexOf("has")===0||h.indexOf("is")===0){return}if(h=="remove"){e.remove(b.blocker);return}if(!b.blocker){b.blocker=e.uniqueId();g=e.add(d.container||e.getRoot(),"iframe",{id:b.blocker,style:"position:absolute;",frameBorder:0,src:'javascript:""'});e.setStyle(g,"opacity",0)}else{g=e.get(b.blocker)}e.setStyles(g,{left:b.getStyle("left",1),top:b.getStyle("top",1),width:b.getStyle("width",1),height:b.getStyle("height",1),display:b.getStyle("display",1),zIndex:parseInt(b.getStyle("zIndex",1)||0)-1})}}})}})(tinymce);(function(c){function e(f){return f.replace(/[\n\r]+/g,"")}var b=c.is,a=c.isIE,d=c.each;c.create("tinymce.dom.Selection",{Selection:function(i,h,g){var f=this;f.dom=i;f.win=h;f.serializer=g;d(["onBeforeSetContent","onBeforeGetContent","onSetContent","onGetContent"],function(j){f[j]=new c.util.Dispatcher(f)});if(!f.win.getSelection){f.tridentSel=new c.dom.TridentSelection(f)}if(c.isIE&&i.boxModel){this._fixIESelection()}c.addUnload(f.destroy,f)},setCursorLocation:function(h,i){var f=this;var g=f.dom.createRng();g.setStart(h,i);g.setEnd(h,i);f.setRng(g);f.collapse(false)},getContent:function(g){var f=this,h=f.getRng(),l=f.dom.create("body"),j=f.getSel(),i,k,m;g=g||{};i=k="";g.get=true;g.format=g.format||"html";g.forced_root_block="";f.onBeforeGetContent.dispatch(f,g);if(g.format=="text"){return f.isCollapsed()?"":(h.text||(j.toString?j.toString():""))}if(h.cloneContents){m=h.cloneContents();if(m){l.appendChild(m)}}else{if(b(h.item)||b(h.htmlText)){l.innerHTML="<br>"+(h.item?h.item(0).outerHTML:h.htmlText);l.removeChild(l.firstChild)}else{l.innerHTML=h.toString()}}if(/^\s/.test(l.innerHTML)){i=" "}if(/\s+$/.test(l.innerHTML)){k=" "}g.getInner=true;g.content=f.isCollapsed()?"":i+f.serializer.serialize(l,g)+k;f.onGetContent.dispatch(f,g);return g.content},setContent:function(g,i){var n=this,f=n.getRng(),j,k=n.win.document,m,l;i=i||{format:"html"};i.set=true;g=i.content=g;if(!i.no_events){n.onBeforeSetContent.dispatch(n,i)}g=i.content;if(f.insertNode){g+='<span id="__caret">_</span>';if(f.startContainer==k&&f.endContainer==k){k.body.innerHTML=g}else{f.deleteContents();if(k.body.childNodes.length==0){k.body.innerHTML=g}else{if(f.createContextualFragment){f.insertNode(f.createContextualFragment(g))}else{m=k.createDocumentFragment();l=k.createElement("div");m.appendChild(l);l.outerHTML=g;f.insertNode(m)}}}j=n.dom.get("__caret");f=k.createRange();f.setStartBefore(j);f.setEndBefore(j);n.setRng(f);n.dom.remove("__caret");try{n.setRng(f)}catch(h){}}else{if(f.item){k.execCommand("Delete",false,null);f=n.getRng()}if(/^\s+/.test(g)){f.pasteHTML('<span id="__mce_tmp">_</span>'+g);n.dom.remove("__mce_tmp")}else{f.pasteHTML(g)}}if(!i.no_events){n.onSetContent.dispatch(n,i)}},getStart:function(){var g=this.getRng(),h,f,j,i;if(g.duplicate||g.item){if(g.item){return g.item(0)}j=g.duplicate();j.collapse(1);h=j.parentElement();f=i=g.parentElement();while(i=i.parentNode){if(i==h){h=f;break}}return h}else{h=g.startContainer;if(h.nodeType==1&&h.hasChildNodes()){h=h.childNodes[Math.min(h.childNodes.length-1,g.startOffset)]}if(h&&h.nodeType==3){return h.parentNode}return h}},getEnd:function(){var g=this,h=g.getRng(),i,f;if(h.duplicate||h.item){if(h.item){return h.item(0)}h=h.duplicate();h.collapse(0);i=h.parentElement();if(i&&i.nodeName=="BODY"){return i.lastChild||i}return i}else{i=h.endContainer;f=h.endOffset;if(i.nodeType==1&&i.hasChildNodes()){i=i.childNodes[f>0?f-1:f]}if(i&&i.nodeType==3){return i.parentNode}return i}},getBookmark:function(r,s){var v=this,m=v.dom,g,j,i,n,h,o,p,l="\uFEFF",u;function f(x,y){var t=0;d(m.select(x),function(A,z){if(A==y){t=z}});return t}if(r==2){function k(){var x=v.getRng(true),t=m.getRoot(),y={};function z(C,H){var B=C[H?"startContainer":"endContainer"],G=C[H?"startOffset":"endOffset"],A=[],D,F,E=0;if(B.nodeType==3){if(s){for(D=B.previousSibling;D&&D.nodeType==3;D=D.previousSibling){G+=D.nodeValue.length}}A.push(G)}else{F=B.childNodes;if(G>=F.length&&F.length){E=1;G=Math.max(0,F.length-1)}A.push(v.dom.nodeIndex(F[G],s)+E)}for(;B&&B!=t;B=B.parentNode){A.push(v.dom.nodeIndex(B,s))}return A}y.start=z(x,true);if(!v.isCollapsed()){y.end=z(x)}return y}if(v.tridentSel){return v.tridentSel.getBookmark(r)}return k()}if(r){return{rng:v.getRng()}}g=v.getRng();i=m.uniqueId();n=tinyMCE.activeEditor.selection.isCollapsed();u="overflow:hidden;line-height:0px";if(g.duplicate||g.item){if(!g.item){j=g.duplicate();try{g.collapse();g.pasteHTML('<span data-mce-type="bookmark" id="'+i+'_start" style="'+u+'">'+l+"</span>");if(!n){j.collapse(false);g.moveToElementText(j.parentElement());if(g.compareEndPoints("StartToEnd",j)==0){j.move("character",-1)}j.pasteHTML('<span data-mce-type="bookmark" id="'+i+'_end" style="'+u+'">'+l+"</span>")}}catch(q){return null}}else{o=g.item(0);h=o.nodeName;return{name:h,index:f(h,o)}}}else{o=v.getNode();h=o.nodeName;if(h=="IMG"){return{name:h,index:f(h,o)}}j=g.cloneRange();if(!n){j.collapse(false);j.insertNode(m.create("span",{"data-mce-type":"bookmark",id:i+"_end",style:u},l))}g.collapse(true);g.insertNode(m.create("span",{"data-mce-type":"bookmark",id:i+"_start",style:u},l))}v.moveToBookmark({id:i,keep:1});return{id:i}},moveToBookmark:function(n){var r=this,l=r.dom,i,h,f,q,j,s,o,p;if(n){if(n.start){f=l.createRng();q=l.getRoot();function g(z){var t=n[z?"start":"end"],v,x,y,u;if(t){y=t[0];for(x=q,v=t.length-1;v>=1;v--){u=x.childNodes;if(t[v]>u.length-1){return}x=u[t[v]]}if(x.nodeType===3){y=Math.min(t[0],x.nodeValue.length)}if(x.nodeType===1){y=Math.min(t[0],x.childNodes.length)}if(z){f.setStart(x,y)}else{f.setEnd(x,y)}}return true}if(r.tridentSel){return r.tridentSel.moveToBookmark(n)}if(g(true)&&g()){r.setRng(f)}}else{if(n.id){function k(A){var u=l.get(n.id+"_"+A),z,t,x,y,v=n.keep;if(u){z=u.parentNode;if(A=="start"){if(!v){t=l.nodeIndex(u)}else{z=u.firstChild;t=1}j=s=z;o=p=t}else{if(!v){t=l.nodeIndex(u)}else{z=u.firstChild;t=1}s=z;p=t}if(!v){y=u.previousSibling;x=u.nextSibling;d(c.grep(u.childNodes),function(B){if(B.nodeType==3){B.nodeValue=B.nodeValue.replace(/\uFEFF/g,"")}});while(u=l.get(n.id+"_"+A)){l.remove(u,1)}if(y&&x&&y.nodeType==x.nodeType&&y.nodeType==3&&!c.isOpera){t=y.nodeValue.length;y.appendData(x.nodeValue);l.remove(x);if(A=="start"){j=s=y;o=p=t}else{s=y;p=t}}}}}function m(t){if(l.isBlock(t)&&!t.innerHTML){t.innerHTML=!a?'<br data-mce-bogus="1" />':" "}return t}k("start");k("end");if(j){f=l.createRng();f.setStart(m(j),o);f.setEnd(m(s),p);r.setRng(f)}}else{if(n.name){r.select(l.select(n.name)[n.index])}else{if(n.rng){r.setRng(n.rng)}}}}}},select:function(k,j){var i=this,l=i.dom,g=l.createRng(),f;if(k){f=l.nodeIndex(k);g.setStart(k.parentNode,f);g.setEnd(k.parentNode,f+1);if(j){function h(m,o){var n=new c.dom.TreeWalker(m,m);do{if(m.nodeType==3&&c.trim(m.nodeValue).length!=0){if(o){g.setStart(m,0)}else{g.setEnd(m,m.nodeValue.length)}return}if(m.nodeName=="BR"){if(o){g.setStartBefore(m)}else{g.setEndBefore(m)}return}}while(m=(o?n.next():n.prev()))}h(k,1);h(k)}i.setRng(g)}return k},isCollapsed:function(){var f=this,h=f.getRng(),g=f.getSel();if(!h||h.item){return false}if(h.compareEndPoints){return h.compareEndPoints("StartToEnd",h)===0}return !g||h.collapsed},collapse:function(f){var h=this,g=h.getRng(),i;if(g.item){i=g.item(0);g=h.win.document.body.createTextRange();g.moveToElementText(i)}g.collapse(!!f);h.setRng(g)},getSel:function(){var g=this,f=this.win;return f.getSelection?f.getSelection():f.document.selection},getRng:function(l){var g=this,h,i,k,j=g.win.document;if(l&&g.tridentSel){return g.tridentSel.getRangeAt(0)}try{if(h=g.getSel()){i=h.rangeCount>0?h.getRangeAt(0):(h.createRange?h.createRange():j.createRange())}}catch(f){}if(c.isIE&&i&&i.setStart&&j.selection.createRange().item){k=j.selection.createRange().item(0);i=j.createRange();i.setStartBefore(k);i.setEndAfter(k)}if(!i){i=j.createRange?j.createRange():j.body.createTextRange()}if(g.selectedRange&&g.explicitRange){if(i.compareBoundaryPoints(i.START_TO_START,g.selectedRange)===0&&i.compareBoundaryPoints(i.END_TO_END,g.selectedRange)===0){i=g.explicitRange}else{g.selectedRange=null;g.explicitRange=null}}return i},setRng:function(i){var h,g=this;if(!g.tridentSel){h=g.getSel();if(h){g.explicitRange=i;try{h.removeAllRanges()}catch(f){}h.addRange(i);g.selectedRange=h.getRangeAt(0)}}else{if(i.cloneRange){g.tridentSel.addRange(i);return}try{i.select()}catch(f){}}},setNode:function(g){var f=this;f.setContent(f.dom.getOuterHTML(g));return g},getNode:function(){var h=this,g=h.getRng(),i=h.getSel(),l,k=g.startContainer,f=g.endContainer;if(!g){return h.dom.getRoot()}if(g.setStart){l=g.commonAncestorContainer;if(!g.collapsed){if(g.startContainer==g.endContainer){if(g.endOffset-g.startOffset<2){if(g.startContainer.hasChildNodes()){l=g.startContainer.childNodes[g.startOffset]}}}if(k.nodeType===3&&f.nodeType===3){function j(p,m){var o=p;while(p&&p.nodeType===3&&p.length===0){p=m?p.nextSibling:p.previousSibling}return p||o}if(k.length===g.startOffset){k=j(k.nextSibling,true)}else{k=k.parentNode}if(g.endOffset===0){f=j(f.previousSibling,false)}else{f=f.parentNode}if(k&&k===f){return k}}}if(l&&l.nodeType==3){return l.parentNode}return l}return g.item?g.item(0):g.parentElement()},getSelectedBlocks:function(g,f){var i=this,j=i.dom,m,h,l,k=[];m=j.getParent(g||i.getStart(),j.isBlock);h=j.getParent(f||i.getEnd(),j.isBlock);if(m){k.push(m)}if(m&&h&&m!=h){l=m;while((l=l.nextSibling)&&l!=h){if(j.isBlock(l)){k.push(l)}}}if(h&&m!=h){k.push(h)}return k},normalize:function(){var g=this,f,i;if(c.isIE){return}function h(p){var k,o,n,m=g.dom,j=m.getRoot(),l;k=f[(p?"start":"end")+"Container"];o=f[(p?"start":"end")+"Offset"];if(k.nodeType===9){k=k.body;o=0}if(k===j){if(k.hasChildNodes()){k=k.childNodes[Math.min(!p&&o>0?o-1:o,k.childNodes.length-1)];o=0;if(k.hasChildNodes()){l=k;n=new c.dom.TreeWalker(k,j);do{if(l.nodeType===3){o=p?0:l.nodeValue.length-1;k=l;break}if(l.nodeName==="BR"){o=m.nodeIndex(l);k=l.parentNode;break}}while(l=(p?n.next():n.prev()));i=true}}}if(i){f["set"+(p?"Start":"End")](k,o)}}f=g.getRng();h(true);if(f.collapsed){h()}if(i){g.setRng(f)}},destroy:function(g){var f=this;f.win=null;if(!g){c.removeUnload(f.destroy)}},_fixIESelection:function(){var g=this.dom,m=g.doc,h=m.body,j,n,f;m.documentElement.unselectable=true;function i(o,r){var p=h.createTextRange();try{p.moveToPoint(o,r)}catch(q){p=null}return p}function l(p){var o;if(p.button){o=i(p.x,p.y);if(o){if(o.compareEndPoints("StartToStart",n)>0){o.setEndPoint("StartToStart",n)}else{o.setEndPoint("EndToEnd",n)}o.select()}}else{k()}}function k(){var o=m.selection.createRange();if(n&&!o.item&&o.compareEndPoints("StartToEnd",o)===0){n.select()}g.unbind(m,"mouseup",k);g.unbind(m,"mousemove",l);n=j=0}g.bind(m,["mousedown","contextmenu"],function(o){if(o.target.nodeName==="HTML"){if(j){k()}f=m.documentElement;if(f.scrollHeight>f.clientHeight){return}j=1;n=i(o.x,o.y);if(n){g.bind(m,"mouseup",k);g.bind(m,"mousemove",l);g.win.focus();n.select()}}})}})})(tinymce);(function(a){a.dom.Serializer=function(e,i,f){var h,b,d=a.isIE,g=a.each,c;if(!e.apply_source_formatting){e.indent=false}e.remove_trailing_brs=true;i=i||a.DOM;f=f||new a.html.Schema(e);e.entity_encoding=e.entity_encoding||"named";h=new a.util.Dispatcher(self);b=new a.util.Dispatcher(self);c=new a.html.DomParser(e,f);c.addAttributeFilter("src,href,style",function(k,j){var o=k.length,l,q,n="data-mce-"+j,p=e.url_converter,r=e.url_converter_scope,m;while(o--){l=k[o];q=l.attributes.map[n];if(q!==m){l.attr(j,q.length>0?q:null);l.attr(n,null)}else{q=l.attributes.map[j];if(j==="style"){q=i.serializeStyle(i.parseStyle(q),l.name)}else{if(p){q=p.call(r,q,j,l.name)}}l.attr(j,q.length>0?q:null)}}});c.addAttributeFilter("class",function(j,k){var l=j.length,m,n;while(l--){m=j[l];n=m.attr("class").replace(/\s*mce(Item\w+|Selected)\s*/g,"");m.attr("class",n.length>0?n:null)}});c.addAttributeFilter("data-mce-type",function(j,l,k){var m=j.length,n;while(m--){n=j[m];if(n.attributes.map["data-mce-type"]==="bookmark"&&!k.cleanup){n.remove()}}});c.addNodeFilter("script,style",function(k,l){var m=k.length,n,o;function j(p){return p.replace(/(<!--\[CDATA\[|\]\]-->)/g,"\n").replace(/^[\r\n]*|[\r\n]*$/g,"").replace(/^\s*(\/\/\s*<!--|\/\/\s*<!\[CDATA\[|<!--|<!\[CDATA\[)[\r\n]*/g,"").replace(/\s*(\/\/\s*\]\]>|\/\/\s*-->|\]\]>|-->|\]\]-->)\s*$/g,"")}while(m--){n=k[m];o=n.firstChild?n.firstChild.value:"";if(l==="script"){n.attr("type",(n.attr("type")||"text/javascript").replace(/^mce\-/,""));if(o.length>0){n.firstChild.value="// <![CDATA[\n"+j(o)+"\n// ]]>"}}else{if(o.length>0){n.firstChild.value="<!--\n"+j(o)+"\n-->"}}}});c.addNodeFilter("#comment",function(j,k){var l=j.length,m;while(l--){m=j[l];if(m.value.indexOf("[CDATA[")===0){m.name="#cdata";m.type=4;m.value=m.value.replace(/^\[CDATA\[|\]\]$/g,"")}else{if(m.value.indexOf("mce:protected ")===0){m.name="#text";m.type=3;m.raw=true;m.value=unescape(m.value).substr(14)}}}});c.addNodeFilter("xml:namespace,input",function(j,k){var l=j.length,m;while(l--){m=j[l];if(m.type===7){m.remove()}else{if(m.type===1){if(k==="input"&&!("type" in m.attributes.map)){m.attr("type","text")}}}}});if(e.fix_list_elements){c.addNodeFilter("ul,ol",function(k,l){var m=k.length,n,j;while(m--){n=k[m];j=n.parent;if(j.name==="ul"||j.name==="ol"){if(n.prev&&n.prev.name==="li"){n.prev.append(n)}}}})}c.addAttributeFilter("data-mce-src,data-mce-href,data-mce-style",function(j,k){var l=j.length;while(l--){j[l].attr(k,null)}});return{schema:f,addNodeFilter:c.addNodeFilter,addAttributeFilter:c.addAttributeFilter,onPreProcess:h,onPostProcess:b,serialize:function(o,m){var l,p,k,j,n;if(d&&i.select("script,style,select,map").length>0){n=o.innerHTML;o=o.cloneNode(false);i.setHTML(o,n)}else{o=o.cloneNode(true)}l=o.ownerDocument.implementation;if(l.createHTMLDocument){p=l.createHTMLDocument("");g(o.nodeName=="BODY"?o.childNodes:[o],function(q){p.body.appendChild(p.importNode(q,true))});if(o.nodeName!="BODY"){o=p.body.firstChild}else{o=p.body}k=i.doc;i.doc=p}m=m||{};m.format=m.format||"html";if(!m.no_events){m.node=o;h.dispatch(self,m)}j=new a.html.Serializer(e,f);m.content=j.serialize(c.parse(m.getInner?o.innerHTML:a.trim(i.getOuterHTML(o),m),m));if(!m.cleanup){m.content=m.content.replace(/\uFEFF/g,"")}if(!m.no_events){b.dispatch(self,m)}if(k){i.doc=k}m.node=null;return m.content},addRules:function(j){f.addValidElements(j)},setRules:function(j){f.setValidElements(j)}}}})(tinymce);(function(a){a.dom.ScriptLoader=function(h){var c=0,k=1,i=2,l={},j=[],f={},d=[],g=0,e;function b(m,v){var x=this,q=a.DOM,s,o,r,n;function p(){q.remove(n);if(s){s.onreadystatechange=s.onload=s=null}v()}function u(){if(typeof(console)!=="undefined"&&console.log){console.log("Failed to load: "+m)}}n=q.uniqueId();if(a.isIE6){o=new a.util.URI(m);r=location;if(o.host==r.hostname&&o.port==r.port&&(o.protocol+":")==r.protocol&&o.protocol.toLowerCase()!="file"){a.util.XHR.send({url:a._addVer(o.getURI()),success:function(y){var t=q.create("script",{type:"text/javascript"});t.text=y;document.getElementsByTagName("head")[0].appendChild(t);q.remove(t);p()},error:u});return}}s=q.create("script",{id:n,type:"text/javascript",src:a._addVer(m)});if(!a.isIE){s.onload=p}s.onerror=u;if(!a.isOpera){s.onreadystatechange=function(){var t=s.readyState;if(t=="complete"||t=="loaded"){p()}}}(document.getElementsByTagName("head")[0]||document.body).appendChild(s)}this.isDone=function(m){return l[m]==i};this.markDone=function(m){l[m]=i};this.add=this.load=function(m,q,n){var o,p=l[m];if(p==e){j.push(m);l[m]=c}if(q){if(!f[m]){f[m]=[]}f[m].push({func:q,scope:n||this})}};this.loadQueue=function(n,m){this.loadScripts(j,n,m)};this.loadScripts=function(m,q,p){var o;function n(r){a.each(f[r],function(s){s.func.call(s.scope)});f[r]=e}d.push({func:q,scope:p||this});o=function(){var r=a.grep(m);m.length=0;a.each(r,function(s){if(l[s]==i){n(s);return}if(l[s]!=k){l[s]=k;g++;b(s,function(){l[s]=i;g--;n(s);o()})}});if(!g){a.each(d,function(s){s.func.call(s.scope)});d.length=0}};o()}};a.ScriptLoader=new a.dom.ScriptLoader()})(tinymce);tinymce.dom.TreeWalker=function(a,c){var b=a;function d(i,f,e,j){var h,g;if(i){if(!j&&i[f]){return i[f]}if(i!=c){h=i[e];if(h){return h}for(g=i.parentNode;g&&g!=c;g=g.parentNode){h=g[e];if(h){return h}}}}}this.current=function(){return b};this.next=function(e){return(b=d(b,"firstChild","nextSibling",e))};this.prev=function(e){return(b=d(b,"lastChild","previousSibling",e))}};(function(a){a.dom.RangeUtils=function(c){var b="\uFEFF";this.walk=function(d,r){var h=d.startContainer,k=d.startOffset,s=d.endContainer,l=d.endOffset,i,f,n,g,q,p,e;e=c.select("td.mceSelected,th.mceSelected");if(e.length>0){a.each(e,function(t){r([t])});return}function o(v,u,t){var x=[];for(;v&&v!=t;v=v[u]){x.push(v)}return x}function m(u,t){do{if(u.parentNode==t){return u}u=u.parentNode}while(u)}function j(v,u,x){var t=x?"nextSibling":"previousSibling";for(g=v,q=g.parentNode;g&&g!=u;g=q){q=g.parentNode;p=o(g==v?g:g[t],t);if(p.length){if(!x){p.reverse()}r(p)}}}if(h.nodeType==1&&h.hasChildNodes()){h=h.childNodes[k]}if(s.nodeType==1&&s.hasChildNodes()){s=s.childNodes[Math.min(l-1,s.childNodes.length-1)]}i=c.findCommonAncestor(h,s);if(h==s){return r([h])}for(g=h;g;g=g.parentNode){if(g==s){return j(h,i,true)}if(g==i){break}}for(g=s;g;g=g.parentNode){if(g==h){return j(s,i)}if(g==i){break}}f=m(h,i)||h;n=m(s,i)||s;j(h,f,true);p=o(f==h?f:f.nextSibling,"nextSibling",n==s?n.nextSibling:n);if(p.length){r(p)}j(s,n)}};a.dom.RangeUtils.compareRanges=function(c,b){if(c&&b){if(c.item||c.duplicate){if(c.item&&b.item&&c.item(0)===b.item(0)){return true}if(c.isEqual&&b.isEqual&&b.isEqual(c)){return true}}else{return c.startContainer==b.startContainer&&c.startOffset==b.startOffset}}return false}})(tinymce);(function(b){var a=b.dom.Event,c=b.each;b.create("tinymce.ui.KeyboardNavigation",{KeyboardNavigation:function(e,f){var p=this,m=e.root,l=e.items,n=e.enableUpDown,i=e.enableLeftRight||!e.enableUpDown,k=e.excludeFromTabOrder,j,h,o,d,g;f=f||b.DOM;j=function(q){g=q.target.id};h=function(q){f.setAttrib(q.target.id,"tabindex","-1")};d=function(q){var r=f.get(g);f.setAttrib(r,"tabindex","0");r.focus()};p.focus=function(){f.get(g).focus()};p.destroy=function(){c(l,function(q){f.unbind(f.get(q.id),"focus",j);f.unbind(f.get(q.id),"blur",h)});f.unbind(f.get(m),"focus",d);f.unbind(f.get(m),"keydown",o);l=f=m=p.focus=j=h=o=d=null;p.destroy=function(){}};p.moveFocus=function(u,r){var q=-1,t=p.controls,s;if(!g){return}c(l,function(x,v){if(x.id===g){q=v;return false}});q+=u;if(q<0){q=l.length-1}else{if(q>=l.length){q=0}}s=l[q];f.setAttrib(g,"tabindex","-1");f.setAttrib(s.id,"tabindex","0");f.get(s.id).focus();if(e.actOnFocus){e.onAction(s.id)}if(r){a.cancel(r)}};o=function(y){var u=37,t=39,x=38,z=40,q=27,s=14,r=13,v=32;switch(y.keyCode){case u:if(i){p.moveFocus(-1)}break;case t:if(i){p.moveFocus(1)}break;case x:if(n){p.moveFocus(-1)}break;case z:if(n){p.moveFocus(1)}break;case q:if(e.onCancel){e.onCancel();a.cancel(y)}break;case s:case r:case v:if(e.onAction){e.onAction(g);a.cancel(y)}break}};c(l,function(s,q){var r;if(!s.id){s.id=f.uniqueId("_mce_item_")}if(k){f.bind(s.id,"blur",h);r="-1"}else{r=(q===0?"0":"-1")}f.setAttrib(s.id,"tabindex",r);f.bind(f.get(s.id),"focus",j)});if(l[0]){g=l[0].id}f.setAttrib(m,"tabindex","-1");f.bind(f.get(m),"focus",d);f.bind(f.get(m),"keydown",o)}})})(tinymce);(function(c){var b=c.DOM,a=c.is;c.create("tinymce.ui.Control",{Control:function(f,e,d){this.id=f;this.settings=e=e||{};this.rendered=false;this.onRender=new c.util.Dispatcher(this);this.classPrefix="";this.scope=e.scope||this;this.disabled=0;this.active=0;this.editor=d},setAriaProperty:function(f,e){var d=b.get(this.id+"_aria")||b.get(this.id);if(d){b.setAttrib(d,"aria-"+f,!!e)}},focus:function(){b.get(this.id).focus()},setDisabled:function(d){if(d!=this.disabled){this.setAriaProperty("disabled",d);this.setState("Disabled",d);this.setState("Enabled",!d);this.disabled=d}},isDisabled:function(){return this.disabled},setActive:function(d){if(d!=this.active){this.setState("Active",d);this.active=d;this.setAriaProperty("pressed",d)}},isActive:function(){return this.active},setState:function(f,d){var e=b.get(this.id);f=this.classPrefix+f;if(d){b.addClass(e,f)}else{b.removeClass(e,f)}},isRendered:function(){return this.rendered},renderHTML:function(){},renderTo:function(d){b.setHTML(d,this.renderHTML())},postRender:function(){var e=this,d;if(a(e.disabled)){d=e.disabled;e.disabled=-1;e.setDisabled(d)}if(a(e.active)){d=e.active;e.active=-1;e.setActive(d)}},remove:function(){b.remove(this.id);this.destroy()},destroy:function(){c.dom.Event.clear(this.id)}})})(tinymce);tinymce.create("tinymce.ui.Container:tinymce.ui.Control",{Container:function(c,b,a){this.parent(c,b,a);this.controls=[];this.lookup={}},add:function(a){this.lookup[a.id]=a;this.controls.push(a);return a},get:function(a){return this.lookup[a]}});tinymce.create("tinymce.ui.Separator:tinymce.ui.Control",{Separator:function(b,a){this.parent(b,a);this.classPrefix="mceSeparator";this.setDisabled(true)},renderHTML:function(){return tinymce.DOM.createHTML("span",{"class":this.classPrefix,role:"separator","aria-orientation":"vertical",tabindex:"-1"})}});(function(d){var c=d.is,b=d.DOM,e=d.each,a=d.walk;d.create("tinymce.ui.MenuItem:tinymce.ui.Control",{MenuItem:function(g,f){this.parent(g,f);this.classPrefix="mceMenuItem"},setSelected:function(f){this.setState("Selected",f);this.setAriaProperty("checked",!!f);this.selected=f},isSelected:function(){return this.selected},postRender:function(){var f=this;f.parent();if(c(f.selected)){f.setSelected(f.selected)}}})})(tinymce);(function(d){var c=d.is,b=d.DOM,e=d.each,a=d.walk;d.create("tinymce.ui.Menu:tinymce.ui.MenuItem",{Menu:function(h,g){var f=this;f.parent(h,g);f.items={};f.collapsed=false;f.menuCount=0;f.onAddItem=new d.util.Dispatcher(this)},expand:function(g){var f=this;if(g){a(f,function(h){if(h.expand){h.expand()}},"items",f)}f.collapsed=false},collapse:function(g){var f=this;if(g){a(f,function(h){if(h.collapse){h.collapse()}},"items",f)}f.collapsed=true},isCollapsed:function(){return this.collapsed},add:function(f){if(!f.settings){f=new d.ui.MenuItem(f.id||b.uniqueId(),f)}this.onAddItem.dispatch(this,f);return this.items[f.id]=f},addSeparator:function(){return this.add({separator:true})},addMenu:function(f){if(!f.collapse){f=this.createMenu(f)}this.menuCount++;return this.add(f)},hasMenus:function(){return this.menuCount!==0},remove:function(f){delete this.items[f.id]},removeAll:function(){var f=this;a(f,function(g){if(g.removeAll){g.removeAll()}else{g.remove()}g.destroy()},"items",f);f.items={}},createMenu:function(g){var f=new d.ui.Menu(g.id||b.uniqueId(),g);f.onAddItem.add(this.onAddItem.dispatch,this.onAddItem);return f}})})(tinymce);(function(e){var d=e.is,c=e.DOM,f=e.each,a=e.dom.Event,b=e.dom.Element;e.create("tinymce.ui.DropMenu:tinymce.ui.Menu",{DropMenu:function(h,g){g=g||{};g.container=g.container||c.doc.body;g.offset_x=g.offset_x||0;g.offset_y=g.offset_y||0;g.vp_offset_x=g.vp_offset_x||0;g.vp_offset_y=g.vp_offset_y||0;if(d(g.icons)&&!g.icons){g["class"]+=" mceNoIcons"}this.parent(h,g);this.onShowMenu=new e.util.Dispatcher(this);this.onHideMenu=new e.util.Dispatcher(this);this.classPrefix="mceMenu"},createMenu:function(j){var h=this,i=h.settings,g;j.container=j.container||i.container;j.parent=h;j.constrain=j.constrain||i.constrain;j["class"]=j["class"]||i["class"];j.vp_offset_x=j.vp_offset_x||i.vp_offset_x;j.vp_offset_y=j.vp_offset_y||i.vp_offset_y;j.keyboard_focus=i.keyboard_focus;g=new e.ui.DropMenu(j.id||c.uniqueId(),j);g.onAddItem.add(h.onAddItem.dispatch,h.onAddItem);return g},focus:function(){var g=this;if(g.keyboardNav){g.keyboardNav.focus()}},update:function(){var i=this,j=i.settings,g=c.get("menu_"+i.id+"_tbl"),l=c.get("menu_"+i.id+"_co"),h,k;h=j.max_width?Math.min(g.clientWidth,j.max_width):g.clientWidth;k=j.max_height?Math.min(g.clientHeight,j.max_height):g.clientHeight;if(!c.boxModel){i.element.setStyles({width:h+2,height:k+2})}else{i.element.setStyles({width:h,height:k})}if(j.max_width){c.setStyle(l,"width",h)}if(j.max_height){c.setStyle(l,"height",k);if(g.clientHeight<j.max_height){c.setStyle(l,"overflow","hidden")}}},showMenu:function(p,n,r){var z=this,A=z.settings,o,g=c.getViewPort(),u,l,v,q,i=2,k,j,m=z.classPrefix;z.collapse(1);if(z.isMenuVisible){return}if(!z.rendered){o=c.add(z.settings.container,z.renderNode());f(z.items,function(h){h.postRender()});z.element=new b("menu_"+z.id,{blocker:1,container:A.container})}else{o=c.get("menu_"+z.id)}if(!e.isOpera){c.setStyles(o,{left:-65535,top:-65535})}c.show(o);z.update();p+=A.offset_x||0;n+=A.offset_y||0;g.w-=4;g.h-=4;if(A.constrain){u=o.clientWidth-i;l=o.clientHeight-i;v=g.x+g.w;q=g.y+g.h;if((p+A.vp_offset_x+u)>v){p=r?r-u:Math.max(0,(v-A.vp_offset_x)-u)}if((n+A.vp_offset_y+l)>q){n=Math.max(0,(q-A.vp_offset_y)-l)}}c.setStyles(o,{left:p,top:n});z.element.update();z.isMenuVisible=1;z.mouseClickFunc=a.add(o,"click",function(s){var h;s=s.target;if(s&&(s=c.getParent(s,"tr"))&&!c.hasClass(s,m+"ItemSub")){h=z.items[s.id];if(h.isDisabled()){return}k=z;while(k){if(k.hideMenu){k.hideMenu()}k=k.settings.parent}if(h.settings.onclick){h.settings.onclick(s)}return a.cancel(s)}});if(z.hasMenus()){z.mouseOverFunc=a.add(o,"mouseover",function(x){var h,t,s;x=x.target;if(x&&(x=c.getParent(x,"tr"))){h=z.items[x.id];if(z.lastMenu){z.lastMenu.collapse(1)}if(h.isDisabled()){return}if(x&&c.hasClass(x,m+"ItemSub")){t=c.getRect(x);h.showMenu((t.x+t.w-i),t.y-i,t.x);z.lastMenu=h;c.addClass(c.get(h.id).firstChild,m+"ItemActive")}}})}a.add(o,"keydown",z._keyHandler,z);z.onShowMenu.dispatch(z);if(A.keyboard_focus){z._setupKeyboardNav()}},hideMenu:function(j){var g=this,i=c.get("menu_"+g.id),h;if(!g.isMenuVisible){return}if(g.keyboardNav){g.keyboardNav.destroy()}a.remove(i,"mouseover",g.mouseOverFunc);a.remove(i,"click",g.mouseClickFunc);a.remove(i,"keydown",g._keyHandler);c.hide(i);g.isMenuVisible=0;if(!j){g.collapse(1)}if(g.element){g.element.hide()}if(h=c.get(g.id)){c.removeClass(h.firstChild,g.classPrefix+"ItemActive")}g.onHideMenu.dispatch(g)},add:function(i){var g=this,h;i=g.parent(i);if(g.isRendered&&(h=c.get("menu_"+g.id))){g._add(c.select("tbody",h)[0],i)}return i},collapse:function(g){this.parent(g);this.hideMenu(1)},remove:function(g){c.remove(g.id);this.destroy();return this.parent(g)},destroy:function(){var g=this,h=c.get("menu_"+g.id);if(g.keyboardNav){g.keyboardNav.destroy()}a.remove(h,"mouseover",g.mouseOverFunc);a.remove(c.select("a",h),"focus",g.mouseOverFunc);a.remove(h,"click",g.mouseClickFunc);a.remove(h,"keydown",g._keyHandler);if(g.element){g.element.remove()}c.remove(h)},renderNode:function(){var i=this,j=i.settings,l,h,k,g;g=c.create("div",{role:"listbox",id:"menu_"+i.id,"class":j["class"],style:"position:absolute;left:0;top:0;z-index:200000;outline:0"});if(i.settings.parent){c.setAttrib(g,"aria-parent","menu_"+i.settings.parent.id)}k=c.add(g,"div",{role:"presentation",id:"menu_"+i.id+"_co","class":i.classPrefix+(j["class"]?" "+j["class"]:"")});i.element=new b("menu_"+i.id,{blocker:1,container:j.container});if(j.menu_line){c.add(k,"span",{"class":i.classPrefix+"Line"})}l=c.add(k,"table",{role:"presentation",id:"menu_"+i.id+"_tbl",border:0,cellPadding:0,cellSpacing:0});h=c.add(l,"tbody");f(i.items,function(m){i._add(h,m)});i.rendered=true;return g},_setupKeyboardNav:function(){var i,h,g=this;i=c.select("#menu_"+g.id)[0];h=c.select("a[role=option]","menu_"+g.id);h.splice(0,0,i);g.keyboardNav=new e.ui.KeyboardNavigation({root:"menu_"+g.id,items:h,onCancel:function(){g.hideMenu()},enableUpDown:true});i.focus()},_keyHandler:function(g){var h=this,i;switch(g.keyCode){case 37:if(h.settings.parent){h.hideMenu();h.settings.parent.focus();a.cancel(g)}break;case 39:if(h.mouseOverFunc){h.mouseOverFunc(g)}break}},_add:function(j,h){var i,q=h.settings,p,l,k,m=this.classPrefix,g;if(q.separator){l=c.add(j,"tr",{id:h.id,"class":m+"ItemSeparator"});c.add(l,"td",{"class":m+"ItemSeparator"});if(i=l.previousSibling){c.addClass(i,"mceLast")}return}i=l=c.add(j,"tr",{id:h.id,"class":m+"Item "+m+"ItemEnabled"});i=k=c.add(i,q.titleItem?"th":"td");i=p=c.add(i,"a",{id:h.id+"_aria",role:q.titleItem?"presentation":"option",href:"javascript:;",onclick:"return false;",onmousedown:"return false;"});if(q.parent){c.setAttrib(p,"aria-haspopup","true");c.setAttrib(p,"aria-owns","menu_"+h.id)}c.addClass(k,q["class"]);g=c.add(i,"span",{"class":"mceIcon"+(q.icon?" mce_"+q.icon:"")});if(q.icon_src){c.add(g,"img",{src:q.icon_src})}i=c.add(i,q.element||"span",{"class":"mceText",title:h.settings.title},h.settings.title);if(h.settings.style){c.setAttrib(i,"style",h.settings.style)}if(j.childNodes.length==1){c.addClass(l,"mceFirst")}if((i=l.previousSibling)&&c.hasClass(i,m+"ItemSeparator")){c.addClass(l,"mceFirst")}if(h.collapse){c.addClass(l,m+"ItemSub")}if(i=l.previousSibling){c.removeClass(i,"mceLast")}c.addClass(l,"mceLast")}})})(tinymce);(function(b){var a=b.DOM;b.create("tinymce.ui.Button:tinymce.ui.Control",{Button:function(e,d,c){this.parent(e,d,c);this.classPrefix="mceButton"},renderHTML:function(){var f=this.classPrefix,e=this.settings,d,c;c=a.encode(e.label||"");d='<a role="button" id="'+this.id+'" href="javascript:;" class="'+f+" "+f+"Enabled "+e["class"]+(c?" "+f+"Labeled":"")+'" onmousedown="return false;" onclick="return false;" aria-labelledby="'+this.id+'_voice" title="'+a.encode(e.title)+'">';if(e.image&&!(this.editor&&this.editor.forcedHighContrastMode)){d+='<img class="mceIcon" src="'+e.image+'" alt="'+a.encode(e.title)+'" />'+c}else{d+='<span class="mceIcon '+e["class"]+'"></span>'+(c?'<span class="'+f+'Label">'+c+"</span>":"")}d+='<span class="mceVoiceLabel mceIconOnly" style="display: none;" id="'+this.id+'_voice">'+e.title+"</span>";d+="</a>";return d},postRender:function(){var c=this,d=c.settings;b.dom.Event.add(c.id,"click",function(f){if(!c.isDisabled()){return d.onclick.call(d.scope,f)}})}})})(tinymce);(function(d){var c=d.DOM,b=d.dom.Event,e=d.each,a=d.util.Dispatcher;d.create("tinymce.ui.ListBox:tinymce.ui.Control",{ListBox:function(i,h,f){var g=this;g.parent(i,h,f);g.items=[];g.onChange=new a(g);g.onPostRender=new a(g);g.onAdd=new a(g);g.onRenderMenu=new d.util.Dispatcher(this);g.classPrefix="mceListBox"},select:function(h){var g=this,j,i;if(h==undefined){return g.selectByIndex(-1)}if(h&&h.call){i=h}else{i=function(f){return f==h}}if(h!=g.selectedValue){e(g.items,function(k,f){if(i(k.value)){j=1;g.selectByIndex(f);return false}});if(!j){g.selectByIndex(-1)}}},selectByIndex:function(f){var h=this,i,j,g;if(f!=h.selectedIndex){i=c.get(h.id+"_text");g=c.get(h.id+"_voiceDesc");j=h.items[f];if(j){h.selectedValue=j.value;h.selectedIndex=f;c.setHTML(i,c.encode(j.title));c.setHTML(g,h.settings.title+" - "+j.title);c.removeClass(i,"mceTitle");c.setAttrib(h.id,"aria-valuenow",j.title)}else{c.setHTML(i,c.encode(h.settings.title));c.setHTML(g,c.encode(h.settings.title));c.addClass(i,"mceTitle");h.selectedValue=h.selectedIndex=null;c.setAttrib(h.id,"aria-valuenow",h.settings.title)}i=0}},add:function(i,f,h){var g=this;h=h||{};h=d.extend(h,{title:i,value:f});g.items.push(h);g.onAdd.dispatch(g,h)},getLength:function(){return this.items.length},renderHTML:function(){var i="",f=this,g=f.settings,j=f.classPrefix;i='<span role="listbox" aria-haspopup="true" aria-labelledby="'+f.id+'_voiceDesc" aria-describedby="'+f.id+'_voiceDesc"><table role="presentation" tabindex="0" id="'+f.id+'" cellpadding="0" cellspacing="0" class="'+j+" "+j+"Enabled"+(g["class"]?(" "+g["class"]):"")+'"><tbody><tr>';i+="<td>"+c.createHTML("span",{id:f.id+"_voiceDesc","class":"voiceLabel",style:"display:none;"},f.settings.title);i+=c.createHTML("a",{id:f.id+"_text",tabindex:-1,href:"javascript:;","class":"mceText",onclick:"return false;",onmousedown:"return false;"},c.encode(f.settings.title))+"</td>";i+="<td>"+c.createHTML("a",{id:f.id+"_open",tabindex:-1,href:"javascript:;","class":"mceOpen",onclick:"return false;",onmousedown:"return false;"},'<span><span style="display:none;" class="mceIconOnly" aria-hidden="true">\u25BC</span></span>')+"</td>";i+="</tr></tbody></table></span>";return i},showMenu:function(){var g=this,i,h=c.get(this.id),f;if(g.isDisabled()||g.items.length==0){return}if(g.menu&&g.menu.isMenuVisible){return g.hideMenu()}if(!g.isMenuRendered){g.renderMenu();g.isMenuRendered=true}i=c.getPos(h);f=g.menu;f.settings.offset_x=i.x;f.settings.offset_y=i.y;f.settings.keyboard_focus=!d.isOpera;if(g.oldID){f.items[g.oldID].setSelected(0)}e(g.items,function(j){if(j.value===g.selectedValue){f.items[j.id].setSelected(1);g.oldID=j.id}});f.showMenu(0,h.clientHeight);b.add(c.doc,"mousedown",g.hideMenu,g);c.addClass(g.id,g.classPrefix+"Selected")},hideMenu:function(g){var f=this;if(f.menu&&f.menu.isMenuVisible){c.removeClass(f.id,f.classPrefix+"Selected");if(g&&g.type=="mousedown"&&(g.target.id==f.id+"_text"||g.target.id==f.id+"_open")){return}if(!g||!c.getParent(g.target,".mceMenu")){c.removeClass(f.id,f.classPrefix+"Selected");b.remove(c.doc,"mousedown",f.hideMenu,f);f.menu.hideMenu()}}},renderMenu:function(){var g=this,f;f=g.settings.control_manager.createDropMenu(g.id+"_menu",{menu_line:1,"class":g.classPrefix+"Menu mceNoIcons",max_width:150,max_height:150});f.onHideMenu.add(function(){g.hideMenu();g.focus()});f.add({title:g.settings.title,"class":"mceMenuItemTitle",onclick:function(){if(g.settings.onselect("")!==false){g.select("")}}});e(g.items,function(h){if(h.value===undefined){f.add({title:h.title,role:"option","class":"mceMenuItemTitle",onclick:function(){if(g.settings.onselect("")!==false){g.select("")}}})}else{h.id=c.uniqueId();h.role="option";h.onclick=function(){if(g.settings.onselect(h.value)!==false){g.select(h.value)}};f.add(h)}});g.onRenderMenu.dispatch(g,f);g.menu=f},postRender:function(){var f=this,g=f.classPrefix;b.add(f.id,"click",f.showMenu,f);b.add(f.id,"keydown",function(h){if(h.keyCode==32){f.showMenu(h);b.cancel(h)}});b.add(f.id,"focus",function(){if(!f._focused){f.keyDownHandler=b.add(f.id,"keydown",function(h){if(h.keyCode==40){f.showMenu();b.cancel(h)}});f.keyPressHandler=b.add(f.id,"keypress",function(i){var h;if(i.keyCode==13){h=f.selectedValue;f.selectedValue=null;b.cancel(i);f.settings.onselect(h)}})}f._focused=1});b.add(f.id,"blur",function(){b.remove(f.id,"keydown",f.keyDownHandler);b.remove(f.id,"keypress",f.keyPressHandler);f._focused=0});if(d.isIE6||!c.boxModel){b.add(f.id,"mouseover",function(){if(!c.hasClass(f.id,g+"Disabled")){c.addClass(f.id,g+"Hover")}});b.add(f.id,"mouseout",function(){if(!c.hasClass(f.id,g+"Disabled")){c.removeClass(f.id,g+"Hover")}})}f.onPostRender.dispatch(f,c.get(f.id))},destroy:function(){this.parent();b.clear(this.id+"_text");b.clear(this.id+"_open")}})})(tinymce);(function(d){var c=d.DOM,b=d.dom.Event,e=d.each,a=d.util.Dispatcher;d.create("tinymce.ui.NativeListBox:tinymce.ui.ListBox",{NativeListBox:function(g,f){this.parent(g,f);this.classPrefix="mceNativeListBox"},setDisabled:function(f){c.get(this.id).disabled=f;this.setAriaProperty("disabled",f)},isDisabled:function(){return c.get(this.id).disabled},select:function(h){var g=this,j,i;if(h==undefined){return g.selectByIndex(-1)}if(h&&h.call){i=h}else{i=function(f){return f==h}}if(h!=g.selectedValue){e(g.items,function(k,f){if(i(k.value)){j=1;g.selectByIndex(f);return false}});if(!j){g.selectByIndex(-1)}}},selectByIndex:function(f){c.get(this.id).selectedIndex=f+1;this.selectedValue=this.items[f]?this.items[f].value:null},add:function(j,g,f){var i,h=this;f=f||{};f.value=g;if(h.isRendered()){c.add(c.get(this.id),"option",f,j)}i={title:j,value:g,attribs:f};h.items.push(i);h.onAdd.dispatch(h,i)},getLength:function(){return this.items.length},renderHTML:function(){var g,f=this;g=c.createHTML("option",{value:""},"-- "+f.settings.title+" --");e(f.items,function(h){g+=c.createHTML("option",{value:h.value},h.title)});g=c.createHTML("select",{id:f.id,"class":"mceNativeListBox","aria-labelledby":f.id+"_aria"},g);g+=c.createHTML("span",{id:f.id+"_aria",style:"display: none"},f.settings.title);return g},postRender:function(){var g=this,h,i=true;g.rendered=true;function f(k){var j=g.items[k.target.selectedIndex-1];if(j&&(j=j.value)){g.onChange.dispatch(g,j);if(g.settings.onselect){g.settings.onselect(j)}}}b.add(g.id,"change",f);b.add(g.id,"keydown",function(k){var j;b.remove(g.id,"change",h);i=false;j=b.add(g.id,"blur",function(){if(i){return}i=true;b.add(g.id,"change",f);b.remove(g.id,"blur",j)});if(d.isWebKit&&(k.keyCode==37||k.keyCode==39)){return b.prevent(k)}if(k.keyCode==13||k.keyCode==32){f(k);return b.cancel(k)}});g.onPostRender.dispatch(g,c.get(g.id))}})})(tinymce);(function(c){var b=c.DOM,a=c.dom.Event,d=c.each;c.create("tinymce.ui.MenuButton:tinymce.ui.Button",{MenuButton:function(g,f,e){this.parent(g,f,e);this.onRenderMenu=new c.util.Dispatcher(this);f.menu_container=f.menu_container||b.doc.body},showMenu:function(){var g=this,j,i,h=b.get(g.id),f;if(g.isDisabled()){return}if(!g.isMenuRendered){g.renderMenu();g.isMenuRendered=true}if(g.isMenuVisible){return g.hideMenu()}j=b.getPos(g.settings.menu_container);i=b.getPos(h);f=g.menu;f.settings.offset_x=i.x;f.settings.offset_y=i.y;f.settings.vp_offset_x=i.x;f.settings.vp_offset_y=i.y;f.settings.keyboard_focus=g._focused;f.showMenu(0,h.clientHeight);a.add(b.doc,"mousedown",g.hideMenu,g);g.setState("Selected",1);g.isMenuVisible=1},renderMenu:function(){var f=this,e;e=f.settings.control_manager.createDropMenu(f.id+"_menu",{menu_line:1,"class":this.classPrefix+"Menu",icons:f.settings.icons});e.onHideMenu.add(function(){f.hideMenu();f.focus()});f.onRenderMenu.dispatch(f,e);f.menu=e},hideMenu:function(g){var f=this;if(g&&g.type=="mousedown"&&b.getParent(g.target,function(h){return h.id===f.id||h.id===f.id+"_open"})){return}if(!g||!b.getParent(g.target,".mceMenu")){f.setState("Selected",0);a.remove(b.doc,"mousedown",f.hideMenu,f);if(f.menu){f.menu.hideMenu()}}f.isMenuVisible=0},postRender:function(){var e=this,f=e.settings;a.add(e.id,"click",function(){if(!e.isDisabled()){if(f.onclick){f.onclick(e.value)}e.showMenu()}})}})})(tinymce);(function(c){var b=c.DOM,a=c.dom.Event,d=c.each;c.create("tinymce.ui.SplitButton:tinymce.ui.MenuButton",{SplitButton:function(g,f,e){this.parent(g,f,e);this.classPrefix="mceSplitButton"},renderHTML:function(){var i,f=this,g=f.settings,e;i="<tbody><tr>";if(g.image){e=b.createHTML("img ",{src:g.image,role:"presentation","class":"mceAction "+g["class"]})}else{e=b.createHTML("span",{"class":"mceAction "+g["class"]},"")}e+=b.createHTML("span",{"class":"mceVoiceLabel mceIconOnly",id:f.id+"_voice",style:"display:none;"},g.title);i+="<td >"+b.createHTML("a",{role:"button",id:f.id+"_action",tabindex:"-1",href:"javascript:;","class":"mceAction "+g["class"],onclick:"return false;",onmousedown:"return false;",title:g.title},e)+"</td>";e=b.createHTML("span",{"class":"mceOpen "+g["class"]},'<span style="display:none;" class="mceIconOnly" aria-hidden="true">\u25BC</span>');i+="<td >"+b.createHTML("a",{role:"button",id:f.id+"_open",tabindex:"-1",href:"javascript:;","class":"mceOpen "+g["class"],onclick:"return false;",onmousedown:"return false;",title:g.title},e)+"</td>";i+="</tr></tbody>";i=b.createHTML("table",{id:f.id,role:"presentation",tabindex:"0","class":"mceSplitButton mceSplitButtonEnabled "+g["class"],cellpadding:"0",cellspacing:"0",title:g.title},i);return b.createHTML("span",{role:"button","aria-labelledby":f.id+"_voice","aria-haspopup":"true"},i)},postRender:function(){var e=this,g=e.settings,f;if(g.onclick){f=function(h){if(!e.isDisabled()){g.onclick(e.value);a.cancel(h)}};a.add(e.id+"_action","click",f);a.add(e.id,["click","keydown"],function(h){var k=32,m=14,i=13,j=38,l=40;if((h.keyCode===32||h.keyCode===13||h.keyCode===14)&&!h.altKey&&!h.ctrlKey&&!h.metaKey){f();a.cancel(h)}else{if(h.type==="click"||h.keyCode===l){e.showMenu();a.cancel(h)}}})}a.add(e.id+"_open","click",function(h){e.showMenu();a.cancel(h)});a.add([e.id,e.id+"_open"],"focus",function(){e._focused=1});a.add([e.id,e.id+"_open"],"blur",function(){e._focused=0});if(c.isIE6||!b.boxModel){a.add(e.id,"mouseover",function(){if(!b.hasClass(e.id,"mceSplitButtonDisabled")){b.addClass(e.id,"mceSplitButtonHover")}});a.add(e.id,"mouseout",function(){if(!b.hasClass(e.id,"mceSplitButtonDisabled")){b.removeClass(e.id,"mceSplitButtonHover")}})}},destroy:function(){this.parent();a.clear(this.id+"_action");a.clear(this.id+"_open");a.clear(this.id)}})})(tinymce);(function(d){var c=d.DOM,a=d.dom.Event,b=d.is,e=d.each;d.create("tinymce.ui.ColorSplitButton:tinymce.ui.SplitButton",{ColorSplitButton:function(i,h,f){var g=this;g.parent(i,h,f);g.settings=h=d.extend({colors:"000000,993300,333300,003300,003366,000080,333399,333333,800000,FF6600,808000,008000,008080,0000FF,666699,808080,FF0000,FF9900,99CC00,339966,33CCCC,3366FF,800080,999999,FF00FF,FFCC00,FFFF00,00FF00,00FFFF,00CCFF,993366,C0C0C0,FF99CC,FFCC99,FFFF99,CCFFCC,CCFFFF,99CCFF,CC99FF,FFFFFF",grid_width:8,default_color:"#888888"},g.settings);g.onShowMenu=new d.util.Dispatcher(g);g.onHideMenu=new d.util.Dispatcher(g);g.value=h.default_color},showMenu:function(){var f=this,g,j,i,h;if(f.isDisabled()){return}if(!f.isMenuRendered){f.renderMenu();f.isMenuRendered=true}if(f.isMenuVisible){return f.hideMenu()}i=c.get(f.id);c.show(f.id+"_menu");c.addClass(i,"mceSplitButtonSelected");h=c.getPos(i);c.setStyles(f.id+"_menu",{left:h.x,top:h.y+i.clientHeight,zIndex:200000});i=0;a.add(c.doc,"mousedown",f.hideMenu,f);f.onShowMenu.dispatch(f);if(f._focused){f._keyHandler=a.add(f.id+"_menu","keydown",function(k){if(k.keyCode==27){f.hideMenu()}});c.select("a",f.id+"_menu")[0].focus()}f.isMenuVisible=1},hideMenu:function(g){var f=this;if(f.isMenuVisible){if(g&&g.type=="mousedown"&&c.getParent(g.target,function(h){return h.id===f.id+"_open"})){return}if(!g||!c.getParent(g.target,".mceSplitButtonMenu")){c.removeClass(f.id,"mceSplitButtonSelected");a.remove(c.doc,"mousedown",f.hideMenu,f);a.remove(f.id+"_menu","keydown",f._keyHandler);c.hide(f.id+"_menu")}f.isMenuVisible=0;f.onHideMenu.dispatch()}},renderMenu:function(){var p=this,h,k=0,q=p.settings,g,j,l,o,f;o=c.add(q.menu_container,"div",{role:"listbox",id:p.id+"_menu","class":q.menu_class+" "+q["class"],style:"position:absolute;left:0;top:-1000px;"});h=c.add(o,"div",{"class":q["class"]+" mceSplitButtonMenu"});c.add(h,"span",{"class":"mceMenuLine"});g=c.add(h,"table",{role:"presentation","class":"mceColorSplitMenu"});j=c.add(g,"tbody");k=0;e(b(q.colors,"array")?q.colors:q.colors.split(","),function(i){i=i.replace(/^#/,"");if(!k--){l=c.add(j,"tr");k=q.grid_width-1}g=c.add(l,"td");g=c.add(g,"a",{role:"option",href:"javascript:;",style:{backgroundColor:"#"+i},title:p.editor.getLang("colors."+i,i),"data-mce-color":"#"+i});if(p.editor.forcedHighContrastMode){g=c.add(g,"canvas",{width:16,height:16,"aria-hidden":"true"});if(g.getContext&&(f=g.getContext("2d"))){f.fillStyle="#"+i;f.fillRect(0,0,16,16)}else{c.remove(g)}}});if(q.more_colors_func){g=c.add(j,"tr");g=c.add(g,"td",{colspan:q.grid_width,"class":"mceMoreColors"});g=c.add(g,"a",{role:"option",id:p.id+"_more",href:"javascript:;",onclick:"return false;","class":"mceMoreColors"},q.more_colors_title);a.add(g,"click",function(i){q.more_colors_func.call(q.more_colors_scope||this);return a.cancel(i)})}c.addClass(h,"mceColorSplitMenu");new d.ui.KeyboardNavigation({root:p.id+"_menu",items:c.select("a",p.id+"_menu"),onCancel:function(){p.hideMenu();p.focus()}});a.add(p.id+"_menu","mousedown",function(i){return a.cancel(i)});a.add(p.id+"_menu","click",function(i){var m;i=c.getParent(i.target,"a",j);if(i&&i.nodeName.toLowerCase()=="a"&&(m=i.getAttribute("data-mce-color"))){p.setColor(m)}return a.cancel(i)});return o},setColor:function(f){this.displayColor(f);this.hideMenu();this.settings.onselect(f)},displayColor:function(g){var f=this;c.setStyle(f.id+"_preview","backgroundColor",g);f.value=g},postRender:function(){var f=this,g=f.id;f.parent();c.add(g+"_action","div",{id:g+"_preview","class":"mceColorPreview"});c.setStyle(f.id+"_preview","backgroundColor",f.value)},destroy:function(){this.parent();a.clear(this.id+"_menu");a.clear(this.id+"_more");c.remove(this.id+"_menu")}})})(tinymce);(function(b){var d=b.DOM,c=b.each,a=b.dom.Event;b.create("tinymce.ui.ToolbarGroup:tinymce.ui.Container",{renderHTML:function(){var f=this,i=[],e=f.controls,j=b.each,g=f.settings;i.push('<div id="'+f.id+'" role="group" aria-labelledby="'+f.id+'_voice">');i.push("<span role='application'>");i.push('<span id="'+f.id+'_voice" class="mceVoiceLabel" style="display:none;">'+d.encode(g.name)+"</span>");j(e,function(h){i.push(h.renderHTML())});i.push("</span>");i.push("</div>");return i.join("")},focus:function(){this.keyNav.focus()},postRender:function(){var f=this,e=[];c(f.controls,function(g){c(g.controls,function(h){if(h.id){e.push(h)}})});f.keyNav=new b.ui.KeyboardNavigation({root:f.id,items:e,onCancel:function(){f.editor.focus()},excludeFromTabOrder:!f.settings.tab_focus_toolbar})},destroy:function(){var e=this;e.parent();e.keyNav.destroy();a.clear(e.id)}})})(tinymce);(function(a){var c=a.DOM,b=a.each;a.create("tinymce.ui.Toolbar:tinymce.ui.Container",{renderHTML:function(){var m=this,f="",j,k,n=m.settings,e,d,g,l;l=m.controls;for(e=0;e<l.length;e++){k=l[e];d=l[e-1];g=l[e+1];if(e===0){j="mceToolbarStart";if(k.Button){j+=" mceToolbarStartButton"}else{if(k.SplitButton){j+=" mceToolbarStartSplitButton"}else{if(k.ListBox){j+=" mceToolbarStartListBox"}}}f+=c.createHTML("td",{"class":j},c.createHTML("span",null,"<!-- IE -->"))}if(d&&k.ListBox){if(d.Button||d.SplitButton){f+=c.createHTML("td",{"class":"mceToolbarEnd"},c.createHTML("span",null,"<!-- IE -->"))}}if(c.stdMode){f+='<td style="position: relative">'+k.renderHTML()+"</td>"}else{f+="<td>"+k.renderHTML()+"</td>"}if(g&&k.ListBox){if(g.Button||g.SplitButton){f+=c.createHTML("td",{"class":"mceToolbarStart"},c.createHTML("span",null,"<!-- IE -->"))}}}j="mceToolbarEnd";if(k.Button){j+=" mceToolbarEndButton"}else{if(k.SplitButton){j+=" mceToolbarEndSplitButton"}else{if(k.ListBox){j+=" mceToolbarEndListBox"}}}f+=c.createHTML("td",{"class":j},c.createHTML("span",null,"<!-- IE -->"));return c.createHTML("table",{id:m.id,"class":"mceToolbar"+(n["class"]?" "+n["class"]:""),cellpadding:"0",cellspacing:"0",align:m.settings.align||"",role:"presentation",tabindex:"-1"},"<tbody><tr>"+f+"</tr></tbody>")}})})(tinymce);(function(b){var a=b.util.Dispatcher,c=b.each;b.create("tinymce.AddOnManager",{AddOnManager:function(){var d=this;d.items=[];d.urls={};d.lookup={};d.onAdd=new a(d)},get:function(d){if(this.lookup[d]){return this.lookup[d].instance}else{return undefined}},dependencies:function(e){var d;if(this.lookup[e]){d=this.lookup[e].dependencies}return d||[]},requireLangPack:function(e){var d=b.settings;if(d&&d.language&&d.language_load!==false){b.ScriptLoader.add(this.urls[e]+"/langs/"+d.language+".js")}},add:function(f,e,d){this.items.push(e);this.lookup[f]={instance:e,dependencies:d};this.onAdd.dispatch(this,f,e);return e},createUrl:function(d,e){if(typeof e==="object"){return e}else{return{prefix:d.prefix,resource:e,suffix:d.suffix}}},addComponents:function(f,d){var e=this.urls[f];b.each(d,function(g){b.ScriptLoader.add(e+"/"+g)})},load:function(j,f,d,h){var g=this,e=f;function i(){var k=g.dependencies(j);b.each(k,function(m){var l=g.createUrl(f,m);g.load(l.resource,l,undefined,undefined)});if(d){if(h){d.call(h)}else{d.call(b.ScriptLoader)}}}if(g.urls[j]){return}if(typeof f==="object"){e=f.prefix+f.resource+f.suffix}if(e.indexOf("/")!=0&&e.indexOf("://")==-1){e=b.baseURL+"/"+e}g.urls[j]=e.substring(0,e.lastIndexOf("/"));if(g.lookup[j]){i()}else{b.ScriptLoader.add(e,i,h)}}});b.PluginManager=new b.AddOnManager();b.ThemeManager=new b.AddOnManager()}(tinymce));(function(j){var g=j.each,d=j.extend,k=j.DOM,i=j.dom.Event,f=j.ThemeManager,b=j.PluginManager,e=j.explode,h=j.util.Dispatcher,a,c=0;j.documentBaseURL=window.location.href.replace(/[\?#].*$/,"").replace(/[\/\\][^\/]+$/,"");if(!/[\/\\]$/.test(j.documentBaseURL)){j.documentBaseURL+="/"}j.baseURL=new j.util.URI(j.documentBaseURL).toAbsolute(j.baseURL);j.baseURI=new j.util.URI(j.baseURL);j.onBeforeUnload=new h(j);i.add(window,"beforeunload",function(l){j.onBeforeUnload.dispatch(j,l)});j.onAddEditor=new h(j);j.onRemoveEditor=new h(j);j.EditorManager=d(j,{editors:[],i18n:{},activeEditor:null,init:function(q){var n=this,p,l=j.ScriptLoader,u,o=[],m;function r(x,y,t){var v=x[y];if(!v){return}if(j.is(v,"string")){t=v.replace(/\.\w+$/,"");t=t?j.resolve(t):0;v=j.resolve(v)}return v.apply(t||this,Array.prototype.slice.call(arguments,2))}q=d({theme:"simple",language:"en"},q);n.settings=q;i.add(document,"init",function(){var s,v;r(q,"onpageload");switch(q.mode){case"exact":s=q.elements||"";if(s.length>0){g(e(s),function(x){if(k.get(x)){m=new j.Editor(x,q);o.push(m);m.render(1)}else{g(document.forms,function(y){g(y.elements,function(z){if(z.name===x){x="mce_editor_"+c++;k.setAttrib(z,"id",x);m=new j.Editor(x,q);o.push(m);m.render(1)}})})}})}break;case"textareas":case"specific_textareas":function t(y,x){return x.constructor===RegExp?x.test(y.className):k.hasClass(y,x)}g(k.select("textarea"),function(x){if(q.editor_deselector&&t(x,q.editor_deselector)){return}if(!q.editor_selector||t(x,q.editor_selector)){u=k.get(x.name);if(!x.id&&!u){x.id=x.name}if(!x.id||n.get(x.id)){x.id=k.uniqueId()}m=new j.Editor(x.id,q);o.push(m);m.render(1)}});break}if(q.oninit){s=v=0;g(o,function(x){v++;if(!x.initialized){x.onInit.add(function(){s++;if(s==v){r(q,"oninit")}})}else{s++}if(s==v){r(q,"oninit")}})}})},get:function(l){if(l===a){return this.editors}return this.editors[l]},getInstanceById:function(l){return this.get(l)},add:function(m){var l=this,n=l.editors;n[m.id]=m;n.push(m);l._setActive(m);l.onAddEditor.dispatch(l,m);if(j.adapter){j.adapter.patchEditor(m)}return m},remove:function(n){var m=this,l,o=m.editors;if(!o[n.id]){return null}delete o[n.id];for(l=0;l<o.length;l++){if(o[l]==n){o.splice(l,1);break}}if(m.activeEditor==n){m._setActive(o[0])}n.destroy();m.onRemoveEditor.dispatch(m,n);return n},execCommand:function(r,p,o){var q=this,n=q.get(o),l;switch(r){case"mceFocus":n.focus();return true;case"mceAddEditor":case"mceAddControl":if(!q.get(o)){new j.Editor(o,q.settings).render()}return true;case"mceAddFrameControl":l=o.window;l.tinyMCE=tinyMCE;l.tinymce=j;j.DOM.doc=l.document;j.DOM.win=l;n=new j.Editor(o.element_id,o);n.render();if(j.isIE){function m(){n.destroy();l.detachEvent("onunload",m);l=l.tinyMCE=l.tinymce=null}l.attachEvent("onunload",m)}o.page_window=null;return true;case"mceRemoveEditor":case"mceRemoveControl":if(n){n.remove()}return true;case"mceToggleEditor":if(!n){q.execCommand("mceAddControl",0,o);return true}if(n.isHidden()){n.show()}else{n.hide()}return true}if(q.activeEditor){return q.activeEditor.execCommand(r,p,o)}return false},execInstanceCommand:function(p,o,n,m){var l=this.get(p);if(l){return l.execCommand(o,n,m)}return false},triggerSave:function(){g(this.editors,function(l){l.save()})},addI18n:function(n,q){var l,m=this.i18n;if(!j.is(n,"string")){g(n,function(r,p){g(r,function(t,s){g(t,function(v,u){if(s==="common"){m[p+"."+u]=v}else{m[p+"."+s+"."+u]=v}})})})}else{g(q,function(r,p){m[n+"."+p]=r})}},_setActive:function(l){this.selectedInstance=this.activeEditor=l}})})(tinymce);(function(m){var n=m.DOM,j=m.dom.Event,f=m.extend,k=m.util.Dispatcher,i=m.each,a=m.isGecko,b=m.isIE,e=m.isWebKit,d=m.is,h=m.ThemeManager,c=m.PluginManager,o=m.inArray,l=m.grep,g=m.explode;m.create("tinymce.Editor",{Editor:function(r,q){var p=this;p.id=p.editorId=r;p.execCommands={};p.queryStateCommands={};p.queryValueCommands={};p.isNotDirty=false;p.plugins={};i(["onPreInit","onBeforeRenderUI","onPostRender","onInit","onRemove","onActivate","onDeactivate","onClick","onEvent","onMouseUp","onMouseDown","onDblClick","onKeyDown","onKeyUp","onKeyPress","onContextMenu","onSubmit","onReset","onPaste","onPreProcess","onPostProcess","onBeforeSetContent","onBeforeGetContent","onSetContent","onGetContent","onLoadContent","onSaveContent","onNodeChange","onChange","onBeforeExecCommand","onExecCommand","onUndo","onRedo","onVisualAid","onSetProgressState"],function(s){p[s]=new k(p)});p.settings=q=f({id:r,language:"en",docs_language:"en",theme:"simple",skin:"default",delta_width:0,delta_height:0,popup_css:"",plugins:"",document_base_url:m.documentBaseURL,add_form_submit_trigger:1,submit_patch:1,add_unload_trigger:1,convert_urls:1,relative_urls:1,remove_script_host:1,table_inline_editing:0,object_resizing:1,cleanup:1,accessibility_focus:1,custom_shortcuts:1,custom_undo_redo_keyboard_shortcuts:1,custom_undo_redo_restore_selection:1,custom_undo_redo:1,doctype:m.isIE6?'<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">':"<!DOCTYPE>",visual_table_class:"mceItemTable",visual:1,font_size_style_values:"xx-small,x-small,small,medium,large,x-large,xx-large",apply_source_formatting:1,directionality:"ltr",forced_root_block:"p",hidden_input:1,padd_empty_editor:1,render_ui:1,init_theme:1,force_p_newlines:1,indentation:"30px",keep_styles:1,fix_table_elements:1,inline_styles:1,convert_fonts_to_spans:true,indent:"simple",indent_before:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,table,thead,tfoot,tbody,tr",indent_after:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,table,thead,tfoot,tbody,tr",validate:true,entity_encoding:"named",url_converter:p.convertURL,url_converter_scope:p,ie7_compat:true},q);p.documentBaseURI=new m.util.URI(q.document_base_url||m.documentBaseURL,{base_uri:tinyMCE.baseURI});p.baseURI=m.baseURI;p.contentCSS=[];p.execCallback("setup",p)},render:function(r){var u=this,v=u.settings,x=u.id,p=m.ScriptLoader;if(!j.domLoaded){j.add(document,"init",function(){u.render()});return}tinyMCE.settings=v;if(!u.getElement()){return}if(m.isIDevice&&!m.isIOS5){return}if(!/TEXTAREA|INPUT/i.test(u.getElement().nodeName)&&v.hidden_input&&n.getParent(x,"form")){n.insertAfter(n.create("input",{type:"hidden",name:x}),x)}if(m.WindowManager){u.windowManager=new m.WindowManager(u)}if(v.encoding=="xml"){u.onGetContent.add(function(s,t){if(t.save){t.content=n.encode(t.content)}})}if(v.add_form_submit_trigger){u.onSubmit.addToTop(function(){if(u.initialized){u.save();u.isNotDirty=1}})}if(v.add_unload_trigger){u._beforeUnload=tinyMCE.onBeforeUnload.add(function(){if(u.initialized&&!u.destroyed&&!u.isHidden()){u.save({format:"raw",no_events:true})}})}m.addUnload(u.destroy,u);if(v.submit_patch){u.onBeforeRenderUI.add(function(){var s=u.getElement().form;if(!s){return}if(s._mceOldSubmit){return}if(!s.submit.nodeType&&!s.submit.length){u.formElement=s;s._mceOldSubmit=s.submit;s.submit=function(){m.triggerSave();u.isNotDirty=1;return u.formElement._mceOldSubmit(u.formElement)}}s=null})}function q(){if(v.language&&v.language_load!==false){p.add(m.baseURL+"/langs/"+v.language+".js")}if(v.theme&&v.theme.charAt(0)!="-"&&!h.urls[v.theme]){h.load(v.theme,"themes/"+v.theme+"/editor_template"+m.suffix+".js")}i(g(v.plugins),function(t){if(t&&!c.urls[t]){if(t.charAt(0)=="-"){t=t.substr(1,t.length);var s=c.dependencies(t);i(s,function(z){var y={prefix:"plugins/",resource:z,suffix:"/editor_plugin"+m.suffix+".js"};var z=c.createUrl(y,z);c.load(z.resource,z)})}else{if(t=="safari"){return}c.load(t,{prefix:"plugins/",resource:t,suffix:"/editor_plugin"+m.suffix+".js"})}}});p.loadQueue(function(){if(!u.removed){u.init()}})}q()},init:function(){var r,H=this,I=H.settings,E,A,D=H.getElement(),q,p,F,y,C,G,z,v=[];m.add(H);I.aria_label=I.aria_label||n.getAttrib(D,"aria-label",H.getLang("aria.rich_text_area"));if(I.theme){I.theme=I.theme.replace(/-/,"");q=h.get(I.theme);H.theme=new q();if(H.theme.init&&I.init_theme){H.theme.init(H,h.urls[I.theme]||m.documentBaseURL.replace(/\/$/,""))}}function B(J){var K=c.get(J),t=c.urls[J]||m.documentBaseURL.replace(/\/$/,""),s;if(K&&m.inArray(v,J)===-1){i(c.dependencies(J),function(u){B(u)});s=new K(H,t);H.plugins[J]=s;if(s.init){s.init(H,t);v.push(J)}}}i(g(I.plugins.replace(/\-/g,"")),B);if(I.popup_css!==false){if(I.popup_css){I.popup_css=H.documentBaseURI.toAbsolute(I.popup_css)}else{I.popup_css=H.baseURI.toAbsolute("themes/"+I.theme+"/skins/"+I.skin+"/dialog.css")}}if(I.popup_css_add){I.popup_css+=","+H.documentBaseURI.toAbsolute(I.popup_css_add)}H.controlManager=new m.ControlManager(H);if(I.custom_undo_redo){H.onBeforeExecCommand.add(function(t,J,u,K,s){if(J!="Undo"&&J!="Redo"&&J!="mceRepaint"&&(!s||!s.skip_undo)){H.undoManager.beforeChange()}});H.onExecCommand.add(function(t,J,u,K,s){if(J!="Undo"&&J!="Redo"&&J!="mceRepaint"&&(!s||!s.skip_undo)){H.undoManager.add()}})}H.onExecCommand.add(function(s,t){if(!/^(FontName|FontSize)$/.test(t)){H.nodeChanged()}});if(a){function x(s,t){if(!t||!t.initial){H.execCommand("mceRepaint")}}H.onUndo.add(x);H.onRedo.add(x);H.onSetContent.add(x)}H.onBeforeRenderUI.dispatch(H,H.controlManager);if(I.render_ui){E=I.width||D.style.width||D.offsetWidth;A=I.height||D.style.height||D.offsetHeight;H.orgDisplay=D.style.display;G=/^[0-9\.]+(|px)$/i;if(G.test(""+E)){E=Math.max(parseInt(E)+(q.deltaWidth||0),100)}if(G.test(""+A)){A=Math.max(parseInt(A)+(q.deltaHeight||0),100)}q=H.theme.renderUI({targetNode:D,width:E,height:A,deltaWidth:I.delta_width,deltaHeight:I.delta_height});H.editorContainer=q.editorContainer}if(I.content_editable){D=r=q=null;return H.setupContentEditable()}if(document.domain&&location.hostname!=document.domain){m.relaxedDomain=document.domain}n.setStyles(q.sizeContainer||q.editorContainer,{width:E,height:A});if(I.content_css){m.each(g(I.content_css),function(s){H.contentCSS.push(H.documentBaseURI.toAbsolute(s))})}A=(q.iframeHeight||A)+(typeof(A)=="number"?(q.deltaHeight||0):"");if(A<100){A=100}H.iframeHTML=I.doctype+'<html><head xmlns="http://www.w3.org/1999/xhtml">';if(I.document_base_url!=m.documentBaseURL){H.iframeHTML+='<base href="'+H.documentBaseURI.getURI()+'" />'}if(I.ie7_compat){H.iframeHTML+='<meta http-equiv="X-UA-Compatible" content="IE=7" />'}else{H.iframeHTML+='<meta http-equiv="X-UA-Compatible" content="IE=edge" />'}H.iframeHTML+='<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';for(z=0;z<H.contentCSS.length;z++){H.iframeHTML+='<link type="text/css" rel="stylesheet" href="'+H.contentCSS[z]+'" />';H.contentCSS=[]}y=I.body_id||"tinymce";if(y.indexOf("=")!=-1){y=H.getParam("body_id","","hash");y=y[H.id]||y}C=I.body_class||"";if(C.indexOf("=")!=-1){C=H.getParam("body_class","","hash");C=C[H.id]||""}H.iframeHTML+='</head><body id="'+y+'" class="mceContentBody '+C+'"><br></body></html>';if(m.relaxedDomain&&(b||(m.isOpera&&parseFloat(opera.version())<11))){F='javascript:(function(){document.open();document.domain="'+document.domain+'";var ed = window.parent.tinyMCE.get("'+H.id+'");document.write(ed.iframeHTML);document.close();ed.setupIframe();})()'}r=n.add(q.iframeContainer,"iframe",{id:H.id+"_ifr",src:F||'javascript:""',frameBorder:"0",allowTransparency:"true",title:I.aria_label,style:{width:"100%",height:A,display:"block"}});H.contentAreaContainer=q.iframeContainer;n.get(q.editorContainer).style.display=H.orgDisplay;n.get(H.id).style.display="none";n.setAttrib(H.id,"aria-hidden",true);if(!m.relaxedDomain||!F){H.setupIframe()}D=r=q=null},setupIframe:function(){var q=this,v=q.settings,x=n.get(q.id),y=q.getDoc(),u,p;if(!b||!m.relaxedDomain){if(a&&!Range.prototype.getClientRects){q.onMouseDown.add(function(t,z){if(z.target.nodeName==="HTML"){var s=q.getBody();s.blur();setTimeout(function(){s.focus()},0)}})}y.open();y.write(q.iframeHTML);y.close();if(m.relaxedDomain){y.domain=m.relaxedDomain}}p=q.getBody();p.disabled=true;if(!v.readonly){p.contentEditable=true}p.disabled=false;q.schema=new m.html.Schema(v);q.dom=new m.dom.DOMUtils(q.getDoc(),{keep_values:true,url_converter:q.convertURL,url_converter_scope:q,hex_colors:v.force_hex_style_colors,class_filter:v.class_filter,update_styles:1,fix_ie_paragraphs:1,schema:q.schema});q.parser=new m.html.DomParser(v,q.schema);if(!q.settings.allow_html_in_named_anchor){q.parser.addAttributeFilter("name",function(s,t){var A=s.length,C,z,B,D;while(A--){D=s[A];if(D.name==="a"&&D.firstChild){B=D.parent;C=D.lastChild;do{z=C.prev;B.insert(C,D);C=z}while(C)}}})}q.parser.addAttributeFilter("src,href,style",function(s,t){var z=s.length,B,D=q.dom,C,A;while(z--){B=s[z];C=B.attr(t);A="data-mce-"+t;if(!B.attributes.map[A]){if(t==="style"){B.attr(A,D.serializeStyle(D.parseStyle(C),B.name))}else{B.attr(A,q.convertURL(C,t,B.name))}}}});q.parser.addNodeFilter("script",function(s,t){var z=s.length;while(z--){s[z].attr("type","mce-text/javascript")}});q.parser.addNodeFilter("#cdata",function(s,t){var z=s.length,A;while(z--){A=s[z];A.type=8;A.name="#comment";A.value="[CDATA["+A.value+"]]"}});q.parser.addNodeFilter("p,h1,h2,h3,h4,h5,h6,div",function(t,z){var A=t.length,B,s=q.schema.getNonEmptyElements();while(A--){B=t[A];if(B.isEmpty(s)){B.empty().append(new m.html.Node("br",1)).shortEnded=true}}});q.serializer=new m.dom.Serializer(v,q.dom,q.schema);q.selection=new m.dom.Selection(q.dom,q.getWin(),q.serializer);q.formatter=new m.Formatter(this);q.formatter.register({alignleft:[{selector:"p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li",styles:{textAlign:"left"}},{selector:"img,table",collapsed:false,styles:{"float":"left"}}],aligncenter:[{selector:"p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li",styles:{textAlign:"center"}},{selector:"img",collapsed:false,styles:{display:"block",marginLeft:"auto",marginRight:"auto"}},{selector:"table",collapsed:false,styles:{marginLeft:"auto",marginRight:"auto"}}],alignright:[{selector:"p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li",styles:{textAlign:"right"}},{selector:"img,table",collapsed:false,styles:{"float":"right"}}],alignfull:[{selector:"p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li",styles:{textAlign:"justify"}}],bold:[{inline:"strong",remove:"all"},{inline:"span",styles:{fontWeight:"bold"}},{inline:"b",remove:"all"}],italic:[{inline:"em",remove:"all"},{inline:"span",styles:{fontStyle:"italic"}},{inline:"i",remove:"all"}],underline:[{inline:"span",styles:{textDecoration:"underline"},exact:true},{inline:"u",remove:"all"}],strikethrough:[{inline:"span",styles:{textDecoration:"line-through"},exact:true},{inline:"strike",remove:"all"}],forecolor:{inline:"span",styles:{color:"%value"},wrap_links:false},hilitecolor:{inline:"span",styles:{backgroundColor:"%value"},wrap_links:false},fontname:{inline:"span",styles:{fontFamily:"%value"}},fontsize:{inline:"span",styles:{fontSize:"%value"}},fontsize_class:{inline:"span",attributes:{"class":"%value"}},blockquote:{block:"blockquote",wrapper:1,remove:"all"},subscript:{inline:"sub"},superscript:{inline:"sup"},link:{inline:"a",selector:"a",remove:"all",split:true,deep:true,onmatch:function(s){return true},onformat:function(z,s,t){i(t,function(B,A){q.dom.setAttrib(z,A,B)})}},removeformat:[{selector:"b,strong,em,i,font,u,strike",remove:"all",split:true,expand:false,block_expand:true,deep:true},{selector:"span",attributes:["style","class"],remove:"empty",split:true,expand:false,deep:true},{selector:"*",attributes:["style","class"],split:false,expand:false,deep:true}]});i("p h1 h2 h3 h4 h5 h6 div address pre div code dt dd samp".split(/\s/),function(s){q.formatter.register(s,{block:s,remove:"all"})});q.formatter.register(q.settings.formats);q.undoManager=new m.UndoManager(q);q.undoManager.onAdd.add(function(t,s){if(t.hasUndo()){return q.onChange.dispatch(q,s,t)}});q.undoManager.onUndo.add(function(t,s){return q.onUndo.dispatch(q,s,t)});q.undoManager.onRedo.add(function(t,s){return q.onRedo.dispatch(q,s,t)});q.forceBlocks=new m.ForceBlocks(q,{forced_root_block:v.forced_root_block});q.editorCommands=new m.EditorCommands(q);q.serializer.onPreProcess.add(function(s,t){return q.onPreProcess.dispatch(q,t,s)});q.serializer.onPostProcess.add(function(s,t){return q.onPostProcess.dispatch(q,t,s)});q.onPreInit.dispatch(q);if(!v.gecko_spellcheck){q.getBody().spellcheck=0}if(!v.readonly){q._addEvents()}q.controlManager.onPostRender.dispatch(q,q.controlManager);q.onPostRender.dispatch(q);q.quirks=new m.util.Quirks(this);if(v.directionality){q.getBody().dir=v.directionality}if(v.nowrap){q.getBody().style.whiteSpace="nowrap"}if(v.handle_node_change_callback){q.onNodeChange.add(function(t,s,z){q.execCallback("handle_node_change_callback",q.id,z,-1,-1,true,q.selection.isCollapsed())})}if(v.save_callback){q.onSaveContent.add(function(s,z){var t=q.execCallback("save_callback",q.id,z.content,q.getBody());if(t){z.content=t}})}if(v.onchange_callback){q.onChange.add(function(t,s){q.execCallback("onchange_callback",q,s)})}if(v.protect){q.onBeforeSetContent.add(function(s,t){if(v.protect){i(v.protect,function(z){t.content=t.content.replace(z,function(A){return"<!--mce:protected "+escape(A)+"-->"})})}})}if(v.convert_newlines_to_brs){q.onBeforeSetContent.add(function(s,t){if(t.initial){t.content=t.content.replace(/\r?\n/g,"<br />")}})}if(v.preformatted){q.onPostProcess.add(function(s,t){t.content=t.content.replace(/^\s*<pre.*?>/,"");t.content=t.content.replace(/<\/pre>\s*$/,"");if(t.set){t.content='<pre class="mceItemHidden">'+t.content+"</pre>"}})}if(v.verify_css_classes){q.serializer.attribValueFilter=function(B,z){var A,t;if(B=="class"){if(!q.classesRE){t=q.dom.getClasses();if(t.length>0){A="";i(t,function(s){A+=(A?"|":"")+s["class"]});q.classesRE=new RegExp("("+A+")","gi")}}return !q.classesRE||/(\bmceItem\w+\b|\bmceTemp\w+\b)/g.test(z)||q.classesRE.test(z)?z:""}return z}}if(v.cleanup_callback){q.onBeforeSetContent.add(function(s,t){t.content=q.execCallback("cleanup_callback","insert_to_editor",t.content,t)});q.onPreProcess.add(function(s,t){if(t.set){q.execCallback("cleanup_callback","insert_to_editor_dom",t.node,t)}if(t.get){q.execCallback("cleanup_callback","get_from_editor_dom",t.node,t)}});q.onPostProcess.add(function(s,t){if(t.set){t.content=q.execCallback("cleanup_callback","insert_to_editor",t.content,t)}if(t.get){t.content=q.execCallback("cleanup_callback","get_from_editor",t.content,t)}})}if(v.save_callback){q.onGetContent.add(function(s,t){if(t.save){t.content=q.execCallback("save_callback",q.id,t.content,q.getBody())}})}if(v.handle_event_callback){q.onEvent.add(function(s,t,z){if(q.execCallback("handle_event_callback",t,s,z)===false){j.cancel(t)}})}q.onSetContent.add(function(){q.addVisual(q.getBody())});if(v.padd_empty_editor){q.onPostProcess.add(function(s,t){t.content=t.content.replace(/^(<p[^>]*>(&nbsp;|&#160;|\s|\u00a0|)<\/p>[\r\n]*|<br \/>[\r\n]*)$/,"")})}if(a){function r(s,t){i(s.dom.select("a"),function(A){var z=A.parentNode;if(s.dom.isBlock(z)&&z.lastChild===A){s.dom.add(z,"br",{"data-mce-bogus":1})}})}q.onExecCommand.add(function(s,t){if(t==="CreateLink"){r(s)}});q.onSetContent.add(q.selection.onSetContent.add(r))}q.load({initial:true,format:"html"});q.startContent=q.getContent({format:"raw"});q.undoManager.add();q.initialized=true;q.onInit.dispatch(q);q.execCallback("setupcontent_callback",q.id,q.getBody(),q.getDoc());q.execCallback("init_instance_callback",q);q.focus(true);q.nodeChanged({initial:1});i(q.contentCSS,function(s){q.dom.loadCSS(s)});if(v.auto_focus){setTimeout(function(){var s=m.get(v.auto_focus);s.selection.select(s.getBody(),1);s.selection.collapse(1);s.getBody().focus();s.getWin().focus()},100)}x=null},setupContentEditable:function(){var p=this,q=p.settings,r=p.getElement();p.contentDocument=q.content_document||document;p.contentWindow=q.content_window||window;p.bodyElement=r;q.content_document=q.content_window=null;n.hide(r);r.contentEditable=p.getParam("content_editable_state",true);n.show(r);if(!q.gecko_spellcheck){p.getDoc().body.spellcheck=0}p.dom=new m.dom.DOMUtils(p.getDoc(),{keep_values:true,url_converter:p.convertURL,url_converter_scope:p,hex_colors:q.force_hex_style_colors,class_filter:q.class_filter,root_element:p.id,fix_ie_paragraphs:1,update_styles:1});p.serializer=new m.dom.Serializer(q,p.dom,schema);p.selection=new m.dom.Selection(p.dom,p.getWin(),p.serializer);p.forceBlocks=new m.ForceBlocks(p,{forced_root_block:q.forced_root_block});p.editorCommands=new m.EditorCommands(p);p.serializer.onPreProcess.add(function(s,t){return p.onPreProcess.dispatch(p,t,s)});p.serializer.onPostProcess.add(function(s,t){return p.onPostProcess.dispatch(p,t,s)});p.onPreInit.dispatch(p);p._addEvents();p.controlManager.onPostRender.dispatch(p,p.controlManager);p.onPostRender.dispatch(p);p.onSetContent.add(function(){p.addVisual(p.getBody())});p.startContent=p.getContent({format:"raw"});p.undoManager.add({initial:true});p.initialized=true;p.onInit.dispatch(p);p.focus(true);p.nodeChanged({initial:1});if(q.content_css){i(g(q.content_css),function(s){p.dom.loadCSS(p.documentBaseURI.toAbsolute(s))})}if(b){p.dom.bind(p.getElement(),"beforedeactivate",function(){p.lastSelectionBookmark=p.selection.getBookmark(1)});p.onBeforeExecCommand.add(function(s,u,t,x,v){if(!n.getParent(s.selection.getStart(),function(y){return y==s.getBody()})){v.terminate=1}if(!n.getParent(s.selection.getEnd(),function(y){return y==s.getBody()})){v.terminate=1}})}r=null},focus:function(u){var y,q=this,s=q.selection,x=q.settings.content_editable,r,p,v=q.getDoc();if(!u){r=s.getRng();if(r.item){p=r.item(0)}q._refreshContentEditable();s.normalize();if(!x){q.getWin().focus()}if(m.isGecko){q.getBody().focus()}if(p&&p.ownerDocument==v){r=v.body.createControlRange();r.addElement(p);r.select()}if(x){if(m.isWebKit){q.getWin().focus()}else{if(m.isIE){q.getElement().setActive()}else{q.getElement().focus()}}}}if(m.activeEditor!=q){if((y=m.activeEditor)!=null){y.onDeactivate.dispatch(y,q)}q.onActivate.dispatch(q,y)}m._setActive(q)},execCallback:function(u){var p=this,r=p.settings[u],q;if(!r){return}if(p.callbackLookup&&(q=p.callbackLookup[u])){r=q.func;q=q.scope}if(d(r,"string")){q=r.replace(/\.\w+$/,"");q=q?m.resolve(q):0;r=m.resolve(r);p.callbackLookup=p.callbackLookup||{};p.callbackLookup[u]={func:r,scope:q}}return r.apply(q||p,Array.prototype.slice.call(arguments,1))},translate:function(p){var r=this.settings.language||"en",q=m.i18n;if(!p){return""}return q[r+"."+p]||p.replace(/{\#([^}]+)\}/g,function(t,s){return q[r+"."+s]||"{#"+s+"}"})},getLang:function(q,p){return m.i18n[(this.settings.language||"en")+"."+q]||(d(p)?p:"{#"+q+"}")},getParam:function(u,r,p){var s=m.trim,q=d(this.settings[u])?this.settings[u]:r,t;if(p==="hash"){t={};if(d(q,"string")){i(q.indexOf("=")>0?q.split(/[;,](?![^=;,]*(?:[;,]|$))/):q.split(","),function(x){x=x.split("=");if(x.length>1){t[s(x[0])]=s(x[1])}else{t[s(x[0])]=s(x)}})}else{t=q}return t}return q},nodeChanged:function(r){var p=this,q=p.selection,u=q.getStart()||p.getBody();if(p.initialized){r=r||{};u=b&&u.ownerDocument!=p.getDoc()?p.getBody():u;r.parents=[];p.dom.getParent(u,function(s){if(s.nodeName=="BODY"){return true}r.parents.push(s)});p.onNodeChange.dispatch(p,r?r.controlManager||p.controlManager:p.controlManager,u,q.isCollapsed(),r)}},addButton:function(r,q){var p=this;p.buttons=p.buttons||{};p.buttons[r]=q},addCommand:function(p,r,q){this.execCommands[p]={func:r,scope:q||this}},addQueryStateHandler:function(p,r,q){this.queryStateCommands[p]={func:r,scope:q||this}},addQueryValueHandler:function(p,r,q){this.queryValueCommands[p]={func:r,scope:q||this}},addShortcut:function(r,u,p,s){var q=this,v;if(!q.settings.custom_shortcuts){return false}q.shortcuts=q.shortcuts||{};if(d(p,"string")){v=p;p=function(){q.execCommand(v,false,null)}}if(d(p,"object")){v=p;p=function(){q.execCommand(v[0],v[1],v[2])}}i(g(r),function(t){var x={func:p,scope:s||this,desc:u,alt:false,ctrl:false,shift:false};i(g(t,"+"),function(y){switch(y){case"alt":case"ctrl":case"shift":x[y]=true;break;default:x.charCode=y.charCodeAt(0);x.keyCode=y.toUpperCase().charCodeAt(0)}});q.shortcuts[(x.ctrl?"ctrl":"")+","+(x.alt?"alt":"")+","+(x.shift?"shift":"")+","+x.keyCode]=x});return true},execCommand:function(x,v,z,p){var r=this,u=0,y,q;if(!/^(mceAddUndoLevel|mceEndUndoLevel|mceBeginUndoLevel|mceRepaint|SelectAll)$/.test(x)&&(!p||!p.skip_focus)){r.focus()}y={};r.onBeforeExecCommand.dispatch(r,x,v,z,y);if(y.terminate){return false}if(r.execCallback("execcommand_callback",r.id,r.selection.getNode(),x,v,z)){r.onExecCommand.dispatch(r,x,v,z,p);return true}if(y=r.execCommands[x]){q=y.func.call(y.scope,v,z);if(q!==true){r.onExecCommand.dispatch(r,x,v,z,p);return q}}i(r.plugins,function(s){if(s.execCommand&&s.execCommand(x,v,z)){r.onExecCommand.dispatch(r,x,v,z,p);u=1;return false}});if(u){return true}if(r.theme&&r.theme.execCommand&&r.theme.execCommand(x,v,z)){r.onExecCommand.dispatch(r,x,v,z,p);return true}if(r.editorCommands.execCommand(x,v,z)){r.onExecCommand.dispatch(r,x,v,z,p);return true}r.getDoc().execCommand(x,v,z);r.onExecCommand.dispatch(r,x,v,z,p)},queryCommandState:function(u){var q=this,v,r;if(q._isHidden()){return}if(v=q.queryStateCommands[u]){r=v.func.call(v.scope);if(r!==true){return r}}v=q.editorCommands.queryCommandState(u);if(v!==-1){return v}try{return this.getDoc().queryCommandState(u)}catch(p){}},queryCommandValue:function(v){var q=this,u,r;if(q._isHidden()){return}if(u=q.queryValueCommands[v]){r=u.func.call(u.scope);if(r!==true){return r}}u=q.editorCommands.queryCommandValue(v);if(d(u)){return u}try{return this.getDoc().queryCommandValue(v)}catch(p){}},show:function(){var p=this;n.show(p.getContainer());n.hide(p.id);p.load()},hide:function(){var p=this,q=p.getDoc();if(b&&q){q.execCommand("SelectAll")}p.save();n.hide(p.getContainer());n.setStyle(p.id,"display",p.orgDisplay)},isHidden:function(){return !n.isHidden(this.id)},setProgressState:function(p,q,r){this.onSetProgressState.dispatch(this,p,q,r);return p},load:function(s){var p=this,r=p.getElement(),q;if(r){s=s||{};s.load=true;q=p.setContent(d(r.value)?r.value:r.innerHTML,s);s.element=r;if(!s.no_events){p.onLoadContent.dispatch(p,s)}s.element=r=null;return q}},save:function(u){var p=this,s=p.getElement(),q,r;if(!s||!p.initialized){return}u=u||{};u.save=true;if(!u.no_events){p.undoManager.typing=false;p.undoManager.add()}u.element=s;q=u.content=p.getContent(u);if(!u.no_events){p.onSaveContent.dispatch(p,u)}q=u.content;if(!/TEXTAREA|INPUT/i.test(s.nodeName)){s.innerHTML=q;if(r=n.getParent(p.id,"form")){i(r.elements,function(t){if(t.name==p.id){t.value=q;return false}})}}else{s.value=q}u.element=s=null;return q},setContent:function(u,s){var r=this,q,p=r.getBody(),t;s=s||{};s.format=s.format||"html";s.set=true;s.content=u;if(!s.no_events){r.onBeforeSetContent.dispatch(r,s)}u=s.content;if(!m.isIE&&(u.length===0||/^\s+$/.test(u))){t=r.settings.forced_root_block;if(t){u="<"+t+'><br data-mce-bogus="1"></'+t+">"}else{u='<br data-mce-bogus="1">'}p.innerHTML=u;r.selection.select(p,true);r.selection.collapse(true);return}if(s.format!=="raw"){u=new m.html.Serializer({},r.schema).serialize(r.parser.parse(u))}s.content=m.trim(u);r.dom.setHTML(p,s.content);if(!s.no_events){r.onSetContent.dispatch(r,s)}r.selection.normalize();return s.content},getContent:function(q){var p=this,r;q=q||{};q.format=q.format||"html";q.get=true;if(!q.no_events){p.onBeforeGetContent.dispatch(p,q)}if(q.format=="raw"){r=p.getBody().innerHTML}else{r=p.serializer.serialize(p.getBody(),q)}q.content=m.trim(r);if(!q.no_events){p.onGetContent.dispatch(p,q)}return q.content},isDirty:function(){var p=this;return m.trim(p.startContent)!=m.trim(p.getContent({format:"raw",no_events:1}))&&!p.isNotDirty},getContainer:function(){var p=this;if(!p.container){p.container=n.get(p.editorContainer||p.id+"_parent")}return p.container},getContentAreaContainer:function(){return this.contentAreaContainer},getElement:function(){return n.get(this.settings.content_element||this.id)},getWin:function(){var p=this,q;if(!p.contentWindow){q=n.get(p.id+"_ifr");if(q){p.contentWindow=q.contentWindow}}return p.contentWindow},getDoc:function(){var q=this,p;if(!q.contentDocument){p=q.getWin();if(p){q.contentDocument=p.document}}return q.contentDocument},getBody:function(){return this.bodyElement||this.getDoc().body},convertURL:function(p,x,v){var q=this,r=q.settings;if(r.urlconverter_callback){return q.execCallback("urlconverter_callback",p,v,true,x)}if(!r.convert_urls||(v&&v.nodeName=="LINK")||p.indexOf("file:")===0){return p}if(r.relative_urls){return q.documentBaseURI.toRelative(p)}p=q.documentBaseURI.toAbsolute(p,r.remove_script_host);return p},addVisual:function(r){var p=this,q=p.settings;r=r||p.getBody();if(!d(p.hasVisual)){p.hasVisual=q.visual}i(p.dom.select("table,a",r),function(t){var s;switch(t.nodeName){case"TABLE":s=p.dom.getAttrib(t,"border");if(!s||s=="0"){if(p.hasVisual){p.dom.addClass(t,q.visual_table_class)}else{p.dom.removeClass(t,q.visual_table_class)}}return;case"A":s=p.dom.getAttrib(t,"name");if(s){if(p.hasVisual){p.dom.addClass(t,"mceItemAnchor")}else{p.dom.removeClass(t,"mceItemAnchor")}}return}});p.onVisualAid.dispatch(p,r,p.hasVisual)},remove:function(){var p=this,q=p.getContainer();p.removed=1;p.hide();p.execCallback("remove_instance_callback",p);p.onRemove.dispatch(p);p.onExecCommand.listeners=[];m.remove(p);n.remove(q)},destroy:function(q){var p=this;if(p.destroyed){return}if(!q){m.removeUnload(p.destroy);tinyMCE.onBeforeUnload.remove(p._beforeUnload);if(p.theme&&p.theme.destroy){p.theme.destroy()}p.controlManager.destroy();p.selection.destroy();p.dom.destroy();if(!p.settings.content_editable){j.clear(p.getWin());j.clear(p.getDoc())}j.clear(p.getBody());j.clear(p.formElement)}if(p.formElement){p.formElement.submit=p.formElement._mceOldSubmit;p.formElement._mceOldSubmit=null}p.contentAreaContainer=p.formElement=p.container=p.settings.content_element=p.bodyElement=p.contentDocument=p.contentWindow=null;if(p.selection){p.selection=p.selection.win=p.selection.dom=p.selection.dom.doc=null}p.destroyed=1},_addEvents:function(){var B=this,r,C=B.settings,q=B.dom,x={mouseup:"onMouseUp",mousedown:"onMouseDown",click:"onClick",keyup:"onKeyUp",keydown:"onKeyDown",keypress:"onKeyPress",submit:"onSubmit",reset:"onReset",contextmenu:"onContextMenu",dblclick:"onDblClick",paste:"onPaste"};function p(t,E){var s=t.type;if(B.removed){return}if(B.onEvent.dispatch(B,t,E)!==false){B[x[t.fakeType||t.type]].dispatch(B,t,E)}}i(x,function(t,s){switch(s){case"contextmenu":q.bind(B.getDoc(),s,p);break;case"paste":q.bind(B.getBody(),s,function(E){p(E)});break;case"submit":case"reset":q.bind(B.getElement().form||n.getParent(B.id,"form"),s,p);break;default:q.bind(C.content_editable?B.getBody():B.getDoc(),s,p)}});q.bind(C.content_editable?B.getBody():(a?B.getDoc():B.getWin()),"focus",function(s){B.focus(true)});if(C.content_editable&&m.isOpera){function D(s){B.focus(true)}q.bind(B.getBody(),"click",D);q.bind(B.getBody(),"keydown",D)}if(m.isGecko){q.bind(B.getDoc(),"DOMNodeInserted",function(t){var s;t=t.target;if(t.nodeType===1&&t.nodeName==="IMG"&&(s=t.getAttribute("data-mce-src"))){t.src=B.documentBaseURI.toAbsolute(s)}})}if(a){function u(){var F=this,H=F.getDoc(),G=F.settings;if(a&&!G.readonly){F._refreshContentEditable();try{H.execCommand("styleWithCSS",0,false)}catch(E){if(!F._isHidden()){try{H.execCommand("useCSS",0,true)}catch(E){}}}if(!G.table_inline_editing){try{H.execCommand("enableInlineTableEditing",false,false)}catch(E){}}if(!G.object_resizing){try{H.execCommand("enableObjectResizing",false,false)}catch(E){}}}}B.onBeforeExecCommand.add(u);B.onMouseDown.add(u)}B.onClick.add(function(s,t){t=t.target;if(m.isWebKit&&t.nodeName=="IMG"){B.selection.getSel().setBaseAndExtent(t,0,t,1)}if(t.nodeName=="A"&&q.hasClass(t,"mceItemAnchor")){B.selection.select(t)}B.nodeChanged()});B.onMouseUp.add(B.nodeChanged);B.onKeyUp.add(function(s,t){var E=t.keyCode;if((E>=33&&E<=36)||(E>=37&&E<=40)||E==13||E==45||E==46||E==8||(m.isMac&&(E==91||E==93))||t.ctrlKey){B.nodeChanged()}});B.onKeyDown.add(function(t,E){if(E.keyCode!=8){return}var G=t.selection.getRng().startContainer;var F=t.selection.getRng().startOffset;while(G&&G.nodeType&&G.nodeType!=1&&G.parentNode){G=G.parentNode}if(G&&G.parentNode&&G.parentNode.tagName==="BLOCKQUOTE"&&G.parentNode.firstChild==G&&F==0){t.formatter.toggle("blockquote",null,G.parentNode);var s=t.selection.getRng();s.setStart(G,0);s.setEnd(G,0);t.selection.setRng(s);t.selection.collapse(false)}});B.onReset.add(function(){B.setContent(B.startContent,{format:"raw"})});if(C.custom_shortcuts){if(C.custom_undo_redo_keyboard_shortcuts){B.addShortcut("ctrl+z",B.getLang("undo_desc"),"Undo");B.addShortcut("ctrl+y",B.getLang("redo_desc"),"Redo")}B.addShortcut("ctrl+b",B.getLang("bold_desc"),"Bold");B.addShortcut("ctrl+i",B.getLang("italic_desc"),"Italic");B.addShortcut("ctrl+u",B.getLang("underline_desc"),"Underline");for(r=1;r<=6;r++){B.addShortcut("ctrl+"+r,"",["FormatBlock",false,"h"+r])}B.addShortcut("ctrl+7","",["FormatBlock",false,"p"]);B.addShortcut("ctrl+8","",["FormatBlock",false,"div"]);B.addShortcut("ctrl+9","",["FormatBlock",false,"address"]);function v(t){var s=null;if(!t.altKey&&!t.ctrlKey&&!t.metaKey){return s}i(B.shortcuts,function(E){if(m.isMac&&E.ctrl!=t.metaKey){return}else{if(!m.isMac&&E.ctrl!=t.ctrlKey){return}}if(E.alt!=t.altKey){return}if(E.shift!=t.shiftKey){return}if(t.keyCode==E.keyCode||(t.charCode&&t.charCode==E.charCode)){s=E;return false}});return s}B.onKeyUp.add(function(s,t){var E=v(t);if(E){return j.cancel(t)}});B.onKeyPress.add(function(s,t){var E=v(t);if(E){return j.cancel(t)}});B.onKeyDown.add(function(s,t){var E=v(t);if(E){E.func.call(E.scope);return j.cancel(t)}})}if(m.isIE){q.bind(B.getDoc(),"controlselect",function(E){var t=B.resizeInfo,s;E=E.target;if(E.nodeName!=="IMG"){return}if(t){q.unbind(t.node,t.ev,t.cb)}if(!q.hasClass(E,"mceItemNoResize")){ev="resizeend";s=q.bind(E,ev,function(G){var F;G=G.target;if(F=q.getStyle(G,"width")){q.setAttrib(G,"width",F.replace(/[^0-9%]+/g,""));q.setStyle(G,"width","")}if(F=q.getStyle(G,"height")){q.setAttrib(G,"height",F.replace(/[^0-9%]+/g,""));q.setStyle(G,"height","")}})}else{ev="resizestart";s=q.bind(E,"resizestart",j.cancel,j)}t=B.resizeInfo={node:E,ev:ev,cb:s}})}if(m.isOpera){B.onClick.add(function(s,t){j.prevent(t)})}if(C.custom_undo_redo){function y(){B.undoManager.typing=false;B.undoManager.add()}q.bind(B.getDoc(),"focusout",function(s){if(!B.removed&&B.undoManager.typing){y()}});B.dom.bind(B.dom.getRoot(),"dragend",function(s){y()});B.onKeyUp.add(function(s,E){var t=E.keyCode;if((t>=33&&t<=36)||(t>=37&&t<=40)||t==13||t==45||E.ctrlKey){y()}});B.onKeyDown.add(function(s,F){var E=F.keyCode,t;if(E==8){t=B.getDoc().selection;if(t&&t.createRange&&t.createRange().item){B.undoManager.beforeChange();s.dom.remove(t.createRange().item(0));y();return j.cancel(F)}}if((E>=33&&E<=36)||(E>=37&&E<=40)||E==13||E==45){if(m.isIE&&E==13){B.undoManager.beforeChange()}if(B.undoManager.typing){y()}return}if((E<16||E>20)&&E!=224&&E!=91&&!B.undoManager.typing){B.undoManager.beforeChange();B.undoManager.typing=true;B.undoManager.add()}});B.onMouseDown.add(function(){if(B.undoManager.typing){y()}})}if(m.isWebKit){q.bind(B.getDoc(),"selectionchange",function(){if(B.selectionTimer){clearTimeout(B.selectionTimer);B.selectionTimer=0}B.selectionTimer=window.setTimeout(function(){B.nodeChanged()},50)})}if(m.isGecko){function A(){var s=B.dom.getAttribs(B.selection.getStart().cloneNode(false));return function(){var t=B.selection.getStart();if(t!==B.getBody()){B.dom.removeAllAttribs(t);i(s,function(E){t.setAttributeNode(E.cloneNode(true))})}}}function z(){var t=B.selection;return !t.isCollapsed()&&t.getStart()!=t.getEnd()}B.onKeyPress.add(function(s,E){var t;if((E.keyCode==8||E.keyCode==46)&&z()){t=A();B.getDoc().execCommand("delete",false,null);t();return j.cancel(E)}});B.dom.bind(B.getDoc(),"cut",function(t){var s;if(z()){s=A();B.onKeyUp.addToTop(j.cancel,j);setTimeout(function(){s();B.onKeyUp.remove(j.cancel,j)},0)}})}},_refreshContentEditable:function(){var q=this,p,r;if(q._isHidden()){p=q.getBody();r=p.parentNode;r.removeChild(p);r.appendChild(p);p.focus()}},_isHidden:function(){var p;if(!a){return 0}p=this.selection.getSel();return(!p||!p.rangeCount||p.rangeCount==0)}})})(tinymce);(function(c){var d=c.each,e,a=true,b=false;c.EditorCommands=function(n){var m=n.dom,p=n.selection,j={state:{},exec:{},value:{}},k=n.settings,q=n.formatter,o;function r(z,y,x){var v;z=z.toLowerCase();if(v=j.exec[z]){v(z,y,x);return a}return b}function l(x){var v;x=x.toLowerCase();if(v=j.state[x]){return v(x)}return -1}function h(x){var v;x=x.toLowerCase();if(v=j.value[x]){return v(x)}return b}function u(v,x){x=x||"exec";d(v,function(z,y){d(y.toLowerCase().split(","),function(A){j[x][A]=z})})}c.extend(this,{execCommand:r,queryCommandState:l,queryCommandValue:h,addCommands:u});function f(y,x,v){if(x===e){x=b}if(v===e){v=null}return n.getDoc().execCommand(y,x,v)}function t(v){return q.match(v)}function s(v,x){q.toggle(v,x?{value:x}:e)}function i(v){o=p.getBookmark(v)}function g(){p.moveToBookmark(o)}u({"mceResetDesignMode,mceBeginUndoLevel":function(){},"mceEndUndoLevel,mceAddUndoLevel":function(){n.undoManager.add()},"Cut,Copy,Paste":function(z){var y=n.getDoc(),v;try{f(z)}catch(x){v=a}if(v||!y.queryCommandSupported(z)){if(c.isGecko){n.windowManager.confirm(n.getLang("clipboard_msg"),function(A){if(A){open("http://www.mozilla.org/editor/midasdemo/securityprefs.html","_blank")}})}else{n.windowManager.alert(n.getLang("clipboard_no_support"))}}},unlink:function(v){if(p.isCollapsed()){p.select(p.getNode())}f(v);p.collapse(b)},"JustifyLeft,JustifyCenter,JustifyRight,JustifyFull":function(v){var x=v.substring(7);d("left,center,right,full".split(","),function(y){if(x!=y){q.remove("align"+y)}});s("align"+x);r("mceRepaint")},"InsertUnorderedList,InsertOrderedList":function(y){var v,x;f(y);v=m.getParent(p.getNode(),"ol,ul");if(v){x=v.parentNode;if(/^(H[1-6]|P|ADDRESS|PRE)$/.test(x.nodeName)){i();m.split(x,v);g()}}},"Bold,Italic,Underline,Strikethrough,Superscript,Subscript":function(v){s(v)},"ForeColor,HiliteColor,FontName":function(y,x,v){s(y,v)},FontSize:function(z,y,x){var v,A;if(x>=1&&x<=7){A=c.explode(k.font_size_style_values);v=c.explode(k.font_size_classes);if(v){x=v[x-1]||x}else{x=A[x-1]||x}}s(z,x)},RemoveFormat:function(v){q.remove(v)},mceBlockQuote:function(v){s("blockquote")},FormatBlock:function(y,x,v){return s(v||"p")},mceCleanup:function(){var v=p.getBookmark();n.setContent(n.getContent({cleanup:a}),{cleanup:a});p.moveToBookmark(v)},mceRemoveNode:function(z,y,x){var v=x||p.getNode();if(v!=n.getBody()){i();n.dom.remove(v,a);g()}},mceSelectNodeDepth:function(z,y,x){var v=0;m.getParent(p.getNode(),function(A){if(A.nodeType==1&&v++==x){p.select(A);return b}},n.getBody())},mceSelectNode:function(y,x,v){p.select(v)},mceInsertContent:function(B,I,K){var y,J,E,z,F,G,D,C,L,x,A,M,v,H;y=n.parser;J=new c.html.Serializer({},n.schema);v='<span id="mce_marker" data-mce-type="bookmark">\uFEFF</span>';G={content:K,format:"html"};p.onBeforeSetContent.dispatch(p,G);K=G.content;if(K.indexOf("{$caret}")==-1){K+="{$caret}"}K=K.replace(/\{\$caret\}/,v);if(!p.isCollapsed()){n.getDoc().execCommand("Delete",false,null)}E=p.getNode();G={context:E.nodeName.toLowerCase()};F=y.parse(K,G);A=F.lastChild;if(A.attr("id")=="mce_marker"){D=A;for(A=A.prev;A;A=A.walk(true)){if(A.type==3||!m.isBlock(A.name)){A.parent.insert(D,A,A.name==="br");break}}}if(!G.invalid){K=J.serialize(F);A=E.firstChild;M=E.lastChild;if(!A||(A===M&&A.nodeName==="BR")){m.setHTML(E,K)}else{p.setContent(K)}}else{p.setContent(v);E=n.selection.getNode();z=n.getBody();if(E.nodeType==9){E=A=z}else{A=E}while(A!==z){E=A;A=A.parentNode}K=E==z?z.innerHTML:m.getOuterHTML(E);K=J.serialize(y.parse(K.replace(/<span (id="mce_marker"|id=mce_marker).+?<\/span>/i,function(){return J.serialize(F)})));if(E==z){m.setHTML(z,K)}else{m.setOuterHTML(E,K)}}D=m.get("mce_marker");C=m.getRect(D);L=m.getViewPort(n.getWin());if((C.y+C.h>L.y+L.h||C.y<L.y)||(C.x>L.x+L.w||C.x<L.x)){H=c.isIE?n.getDoc().documentElement:n.getBody();H.scrollLeft=C.x;H.scrollTop=C.y-L.h+25}x=m.createRng();A=D.previousSibling;if(A&&A.nodeType==3){x.setStart(A,A.nodeValue.length)}else{x.setStartBefore(D);x.setEndBefore(D)}m.remove(D);p.setRng(x);p.onSetContent.dispatch(p,G);n.addVisual()},mceInsertRawHTML:function(y,x,v){p.setContent("tiny_mce_marker");n.setContent(n.getContent().replace(/tiny_mce_marker/g,function(){return v}))},mceSetContent:function(y,x,v){n.setContent(v)},"Indent,Outdent":function(z){var x,v,y;x=k.indentation;v=/[a-z%]+$/i.exec(x);x=parseInt(x);if(!l("InsertUnorderedList")&&!l("InsertOrderedList")){d(p.getSelectedBlocks(),function(A){if(z=="outdent"){y=Math.max(0,parseInt(A.style.paddingLeft||0)-x);m.setStyle(A,"paddingLeft",y?y+v:"")}else{m.setStyle(A,"paddingLeft",(parseInt(A.style.paddingLeft||0)+x)+v)}})}else{f(z)}},mceRepaint:function(){var x;if(c.isGecko){try{i(a);if(p.getSel()){p.getSel().selectAllChildren(n.getBody())}p.collapse(a);g()}catch(v){}}},mceToggleFormat:function(y,x,v){q.toggle(v)},InsertHorizontalRule:function(){n.execCommand("mceInsertContent",false,"<hr />")},mceToggleVisualAid:function(){n.hasVisual=!n.hasVisual;n.addVisual()},mceReplaceContent:function(y,x,v){n.execCommand("mceInsertContent",false,v.replace(/\{\$selection\}/g,p.getContent({format:"text"})))},mceInsertLink:function(z,y,x){var v;if(typeof(x)=="string"){x={href:x}}v=m.getParent(p.getNode(),"a");x.href=x.href.replace(" ","%20");if(!v||!x.href){q.remove("link")}if(x.href){q.apply("link",x,v)}},selectAll:function(){var x=m.getRoot(),v=m.createRng();v.setStart(x,0);v.setEnd(x,x.childNodes.length);n.selection.setRng(v)}});u({"JustifyLeft,JustifyCenter,JustifyRight,JustifyFull":function(v){return t("align"+v.substring(7))},"Bold,Italic,Underline,Strikethrough,Superscript,Subscript":function(v){return t(v)},mceBlockQuote:function(){return t("blockquote")},Outdent:function(){var v;if(k.inline_styles){if((v=m.getParent(p.getStart(),m.isBlock))&&parseInt(v.style.paddingLeft)>0){return a}if((v=m.getParent(p.getEnd(),m.isBlock))&&parseInt(v.style.paddingLeft)>0){return a}}return l("InsertUnorderedList")||l("InsertOrderedList")||(!k.inline_styles&&!!m.getParent(p.getNode(),"BLOCKQUOTE"))},"InsertUnorderedList,InsertOrderedList":function(v){return m.getParent(p.getNode(),v=="insertunorderedlist"?"UL":"OL")}},"state");u({"FontSize,FontName":function(y){var x=0,v;if(v=m.getParent(p.getNode(),"span")){if(y=="fontsize"){x=v.style.fontSize}else{x=v.style.fontFamily.replace(/, /g,",").replace(/[\'\"]/g,"").toLowerCase()}}return x}},"value");if(k.custom_undo_redo){u({Undo:function(){n.undoManager.undo()},Redo:function(){n.undoManager.redo()}})}}})(tinymce);(function(b){var a=b.util.Dispatcher;b.UndoManager=function(f){var d,e=0,h=[],c;function g(){return b.trim(f.getContent({format:"raw",no_events:1}))}return d={typing:false,onAdd:new a(d),onUndo:new a(d),onRedo:new a(d),beforeChange:function(){c=f.selection.getBookmark(2,true)},add:function(m){var j,k=f.settings,l;m=m||{};m.content=g();l=h[e];if(l&&l.content==m.content){return null}if(h[e]){h[e].beforeBookmark=c}if(k.custom_undo_redo_levels){if(h.length>k.custom_undo_redo_levels){for(j=0;j<h.length-1;j++){h[j]=h[j+1]}h.length--;e=h.length}}m.bookmark=f.selection.getBookmark(2,true);if(e<h.length-1){h.length=e+1}h.push(m);e=h.length-1;d.onAdd.dispatch(d,m);f.isNotDirty=0;return m},undo:function(){var k,j;if(d.typing){d.add();d.typing=false}if(e>0){k=h[--e];f.setContent(k.content,{format:"raw"});f.selection.moveToBookmark(k.beforeBookmark);d.onUndo.dispatch(d,k)}return k},redo:function(){var i;if(e<h.length-1){i=h[++e];f.setContent(i.content,{format:"raw"});f.selection.moveToBookmark(i.bookmark);d.onRedo.dispatch(d,i)}return i},clear:function(){h=[];e=0;d.typing=false},hasUndo:function(){return e>0||this.typing},hasRedo:function(){return e<h.length-1&&!this.typing}}}})(tinymce);(function(l){var j=l.dom.Event,c=l.isIE,a=l.isGecko,b=l.isOpera,i=l.each,h=l.extend,d=true,g=false;function k(o){var p,n,m;do{if(/^(SPAN|STRONG|B|EM|I|FONT|STRIKE|U)$/.test(o.nodeName)){if(p){n=o.cloneNode(false);n.appendChild(p);p=n}else{p=m=o.cloneNode(false)}p.removeAttribute("id")}}while(o=o.parentNode);if(p){return{wrapper:p,inner:m}}}function f(n,o){var m=o.ownerDocument.createRange();m.setStart(n.endContainer,n.endOffset);m.setEndAfter(o);return m.cloneContents().textContent.length==0}function e(o,q,m){var n,p;if(q.isEmpty(m)){n=q.getParent(m,"ul,ol");if(!q.getParent(n.parentNode,"ul,ol")){q.split(n,m);p=q.create("p",0,'<br data-mce-bogus="1" />');q.replace(p,m);o.select(p,1)}return g}return d}l.create("tinymce.ForceBlocks",{ForceBlocks:function(m){var n=this,o=m.settings,p;n.editor=m;n.dom=m.dom;p=(o.forced_root_block||"p").toLowerCase();o.element=p.toUpperCase();m.onPreInit.add(n.setup,n)},setup:function(){var n=this,m=n.editor,p=m.settings,u=m.dom,o=m.selection,q=m.schema.getBlockElements();if(p.forced_root_block){function v(){var y=o.getStart(),t=m.getBody(),s,z,D,F,E,x,A,B=-16777215;if(!y||y.nodeType!==1){return}while(y!=t){if(q[y.nodeName]){return}y=y.parentNode}s=o.getRng();if(s.setStart){z=s.startContainer;D=s.startOffset;F=s.endContainer;E=s.endOffset}else{if(s.item){s=m.getDoc().body.createTextRange();s.moveToElementText(s.item(0))}tmpRng=s.duplicate();tmpRng.collapse(true);D=tmpRng.move("character",B)*-1;if(!tmpRng.collapsed){tmpRng=s.duplicate();tmpRng.collapse(false);E=(tmpRng.move("character",B)*-1)-D}}for(y=t.firstChild;y;y){if(y.nodeType===3||(y.nodeType==1&&!q[y.nodeName])){if(!x){x=u.create(p.forced_root_block);y.parentNode.insertBefore(x,y)}A=y;y=y.nextSibling;x.appendChild(A)}else{x=null;y=y.nextSibling}}if(s.setStart){s.setStart(z,D);s.setEnd(F,E);o.setRng(s)}else{try{s=m.getDoc().body.createTextRange();s.moveToElementText(t);s.collapse(true);s.moveStart("character",D);if(E>0){s.moveEnd("character",E)}s.select()}catch(C){}}m.nodeChanged()}m.onKeyUp.add(v);m.onClick.add(v)}if(p.force_br_newlines){if(c){m.onKeyPress.add(function(s,t){var x;if(t.keyCode==13&&o.getNode().nodeName!="LI"){o.setContent('<br id="__" /> ',{format:"raw"});x=u.get("__");x.removeAttribute("id");o.select(x);o.collapse();return j.cancel(t)}})}}if(p.force_p_newlines){if(!c){m.onKeyPress.add(function(s,t){if(t.keyCode==13&&!t.shiftKey&&!n.insertPara(t)){j.cancel(t)}})}else{l.addUnload(function(){n._previousFormats=0});m.onKeyPress.add(function(s,t){n._previousFormats=0;if(t.keyCode==13&&!t.shiftKey&&s.selection.isCollapsed()&&p.keep_styles){n._previousFormats=k(s.selection.getStart())}});m.onKeyUp.add(function(t,y){if(y.keyCode==13&&!y.shiftKey){var x=t.selection.getStart(),s=n._previousFormats;if(!x.hasChildNodes()&&s){x=u.getParent(x,u.isBlock);if(x&&x.nodeName!="LI"){x.innerHTML="";if(n._previousFormats){x.appendChild(s.wrapper);s.inner.innerHTML="\uFEFF"}else{x.innerHTML="\uFEFF"}o.select(x,1);o.collapse(true);t.getDoc().execCommand("Delete",false,null);n._previousFormats=0}}}})}if(a){m.onKeyDown.add(function(s,t){if((t.keyCode==8||t.keyCode==46)&&!t.shiftKey){n.backspaceDelete(t,t.keyCode==8)}})}}if(l.isWebKit){function r(t){var s=o.getRng(),x,A=u.create("div",null," "),z,y=u.getViewPort(t.getWin()).h;s.insertNode(x=u.create("br"));s.setStartAfter(x);s.setEndAfter(x);o.setRng(s);if(o.getSel().focusNode==x.previousSibling){o.select(u.insertAfter(u.doc.createTextNode("\u00a0"),x));o.collapse(d)}u.insertAfter(A,x);z=u.getPos(A).y;u.remove(A);if(z>y){t.getWin().scrollTo(0,z)}}m.onKeyPress.add(function(s,t){if(t.keyCode==13&&(t.shiftKey||(p.force_br_newlines&&!u.getParent(o.getNode(),"h1,h2,h3,h4,h5,h6,ol,ul")))){r(s);j.cancel(t)}})}if(c){if(p.element!="P"){m.onKeyPress.add(function(s,t){n.lastElm=o.getNode().nodeName});m.onKeyUp.add(function(t,x){var z,y=o.getNode(),s=t.getBody();if(s.childNodes.length===1&&y.nodeName=="P"){y=u.rename(y,p.element);o.select(y);o.collapse();t.nodeChanged()}else{if(x.keyCode==13&&!x.shiftKey&&n.lastElm!="P"){z=u.getParent(y,"p");if(z){u.rename(z,p.element);t.nodeChanged()}}}})}}},getParentBlock:function(o){var m=this.dom;return m.getParent(o,m.isBlock)},insertPara:function(Q){var E=this,v=E.editor,M=v.dom,R=v.getDoc(),V=v.settings,F=v.selection.getSel(),G=F.getRangeAt(0),U=R.body;var J,K,H,O,N,q,o,u,z,m,C,T,p,x,I,L=M.getViewPort(v.getWin()),B,D,A;v.undoManager.beforeChange();J=R.createRange();J.setStart(F.anchorNode,F.anchorOffset);J.collapse(d);K=R.createRange();K.setStart(F.focusNode,F.focusOffset);K.collapse(d);H=J.compareBoundaryPoints(J.START_TO_END,K)<0;O=H?F.anchorNode:F.focusNode;N=H?F.anchorOffset:F.focusOffset;q=H?F.focusNode:F.anchorNode;o=H?F.focusOffset:F.anchorOffset;if(O===q&&/^(TD|TH)$/.test(O.nodeName)){if(O.firstChild.nodeName=="BR"){M.remove(O.firstChild)}if(O.childNodes.length==0){v.dom.add(O,V.element,null,"<br />");T=v.dom.add(O,V.element,null,"<br />")}else{I=O.innerHTML;O.innerHTML="";v.dom.add(O,V.element,null,I);T=v.dom.add(O,V.element,null,"<br />")}G=R.createRange();G.selectNodeContents(T);G.collapse(1);v.selection.setRng(G);return g}if(O==U&&q==U&&U.firstChild&&v.dom.isBlock(U.firstChild)){O=q=O.firstChild;N=o=0;J=R.createRange();J.setStart(O,0);K=R.createRange();K.setStart(q,0)}if(!R.body.hasChildNodes()){R.body.appendChild(M.create("br"))}O=O.nodeName=="HTML"?R.body:O;O=O.nodeName=="BODY"?O.firstChild:O;q=q.nodeName=="HTML"?R.body:q;q=q.nodeName=="BODY"?q.firstChild:q;u=E.getParentBlock(O);z=E.getParentBlock(q);m=u?u.nodeName:V.element;if(I=E.dom.getParent(u,"li,pre")){if(I.nodeName=="LI"){return e(v.selection,E.dom,I)}return d}if(u&&(u.nodeName=="CAPTION"||/absolute|relative|fixed/gi.test(M.getStyle(u,"position",1)))){m=V.element;u=null}if(z&&(z.nodeName=="CAPTION"||/absolute|relative|fixed/gi.test(M.getStyle(u,"position",1)))){m=V.element;z=null}if(/(TD|TABLE|TH|CAPTION)/.test(m)||(u&&m=="DIV"&&/left|right/gi.test(M.getStyle(u,"float",1)))){m=V.element;u=z=null}C=(u&&u.nodeName==m)?u.cloneNode(0):v.dom.create(m);T=(z&&z.nodeName==m)?z.cloneNode(0):v.dom.create(m);T.removeAttribute("id");if(/^(H[1-6])$/.test(m)&&f(G,u)){T=v.dom.create(V.element)}I=p=O;do{if(I==U||I.nodeType==9||E.dom.isBlock(I)||/(TD|TABLE|TH|CAPTION)/.test(I.nodeName)){break}p=I}while((I=I.previousSibling?I.previousSibling:I.parentNode));I=x=q;do{if(I==U||I.nodeType==9||E.dom.isBlock(I)||/(TD|TABLE|TH|CAPTION)/.test(I.nodeName)){break}x=I}while((I=I.nextSibling?I.nextSibling:I.parentNode));if(p.nodeName==m){J.setStart(p,0)}else{J.setStartBefore(p)}J.setEnd(O,N);C.appendChild(J.cloneContents()||R.createTextNode(""));try{K.setEndAfter(x)}catch(P){}K.setStart(q,o);T.appendChild(K.cloneContents()||R.createTextNode(""));G=R.createRange();if(!p.previousSibling&&p.parentNode.nodeName==m){G.setStartBefore(p.parentNode)}else{if(J.startContainer.nodeName==m&&J.startOffset==0){G.setStartBefore(J.startContainer)}else{G.setStart(J.startContainer,J.startOffset)}}if(!x.nextSibling&&x.parentNode.nodeName==m){G.setEndAfter(x.parentNode)}else{G.setEnd(K.endContainer,K.endOffset)}G.deleteContents();if(b){v.getWin().scrollTo(0,L.y)}if(C.firstChild&&C.firstChild.nodeName==m){C.innerHTML=C.firstChild.innerHTML}if(T.firstChild&&T.firstChild.nodeName==m){T.innerHTML=T.firstChild.innerHTML}function S(y,s){var r=[],X,W,t;y.innerHTML="";if(V.keep_styles){W=s;do{if(/^(SPAN|STRONG|B|EM|I|FONT|STRIKE|U)$/.test(W.nodeName)){X=W.cloneNode(g);M.setAttrib(X,"id","");r.push(X)}}while(W=W.parentNode)}if(r.length>0){for(t=r.length-1,X=y;t>=0;t--){X=X.appendChild(r[t])}r[0].innerHTML=b?"\u00a0":"<br />";return r[0]}else{y.innerHTML=b?"\u00a0":"<br />"}}if(M.isEmpty(C)){S(C,O)}if(M.isEmpty(T)){A=S(T,q)}if(b&&parseFloat(opera.version())<9.5){G.insertNode(C);G.insertNode(T)}else{G.insertNode(T);G.insertNode(C)}T.normalize();C.normalize();v.selection.select(T,true);v.selection.collapse(true);B=v.dom.getPos(T).y;if(B<L.y||B+25>L.y+L.h){v.getWin().scrollTo(0,B<L.y?B:B-L.h+25)}v.undoManager.add();return g},backspaceDelete:function(u,B){var C=this,s=C.editor,y=s.getBody(),q=s.dom,p,v=s.selection,o=v.getRng(),x=o.startContainer,p,z,A,m;if(!B&&o.collapsed&&x.nodeType==1&&o.startOffset==x.childNodes.length){m=new l.dom.TreeWalker(x.lastChild,x);for(p=x.lastChild;p;p=m.prev()){if(p.nodeType==3){o.setStart(p,p.nodeValue.length);o.collapse(true);v.setRng(o);return}}}if(x&&s.dom.isBlock(x)&&!/^(TD|TH)$/.test(x.nodeName)&&B){if(x.childNodes.length==0||(x.childNodes.length==1&&x.firstChild.nodeName=="BR")){p=x;while((p=p.previousSibling)&&!s.dom.isBlock(p)){}if(p){if(x!=y.firstChild){z=s.dom.doc.createTreeWalker(p,NodeFilter.SHOW_TEXT,null,g);while(A=z.nextNode()){p=A}o=s.getDoc().createRange();o.setStart(p,p.nodeValue?p.nodeValue.length:0);o.setEnd(p,p.nodeValue?p.nodeValue.length:0);v.setRng(o);s.dom.remove(x)}return j.cancel(u)}}}}})})(tinymce);(function(c){var b=c.DOM,a=c.dom.Event,d=c.each,e=c.extend;c.create("tinymce.ControlManager",{ControlManager:function(f,j){var h=this,g;j=j||{};h.editor=f;h.controls={};h.onAdd=new c.util.Dispatcher(h);h.onPostRender=new c.util.Dispatcher(h);h.prefix=j.prefix||f.id+"_";h._cls={};h.onPostRender.add(function(){d(h.controls,function(i){i.postRender()})})},get:function(f){return this.controls[this.prefix+f]||this.controls[f]},setActive:function(h,f){var g=null;if(g=this.get(h)){g.setActive(f)}return g},setDisabled:function(h,f){var g=null;if(g=this.get(h)){g.setDisabled(f)}return g},add:function(g){var f=this;if(g){f.controls[g.id]=g;f.onAdd.dispatch(g,f)}return g},createControl:function(i){var h,g=this,f=g.editor;d(f.plugins,function(j){if(j.createControl){h=j.createControl(i,g);if(h){return false}}});switch(i){case"|":case"separator":return g.createSeparator()}if(!h&&f.buttons&&(h=f.buttons[i])){return g.createButton(i,h)}return g.add(h)},createDropMenu:function(f,n,h){var m=this,i=m.editor,j,g,k,l;n=e({"class":"mceDropDown",constrain:i.settings.constrain_menus},n);n["class"]=n["class"]+" "+i.getParam("skin")+"Skin";if(k=i.getParam("skin_variant")){n["class"]+=" "+i.getParam("skin")+"Skin"+k.substring(0,1).toUpperCase()+k.substring(1)}f=m.prefix+f;l=h||m._cls.dropmenu||c.ui.DropMenu;j=m.controls[f]=new l(f,n);j.onAddItem.add(function(r,q){var p=q.settings;p.title=i.getLang(p.title,p.title);if(!p.onclick){p.onclick=function(o){if(p.cmd){i.execCommand(p.cmd,p.ui||false,p.value)}}}});i.onRemove.add(function(){j.destroy()});if(c.isIE){j.onShowMenu.add(function(){i.focus();g=i.selection.getBookmark(1)});j.onHideMenu.add(function(){if(g){i.selection.moveToBookmark(g);g=0}})}return m.add(j)},createListBox:function(f,n,h){var l=this,j=l.editor,i,k,m;if(l.get(f)){return null}n.title=j.translate(n.title);n.scope=n.scope||j;if(!n.onselect){n.onselect=function(o){j.execCommand(n.cmd,n.ui||false,o||n.value)}}n=e({title:n.title,"class":"mce_"+f,scope:n.scope,control_manager:l},n);f=l.prefix+f;function g(o){return o.settings.use_accessible_selects&&!c.isGecko}if(j.settings.use_native_selects||g(j)){k=new c.ui.NativeListBox(f,n)}else{m=h||l._cls.listbox||c.ui.ListBox;k=new m(f,n,j)}l.controls[f]=k;if(c.isWebKit){k.onPostRender.add(function(p,o){a.add(o,"mousedown",function(){j.bookmark=j.selection.getBookmark(1)});a.add(o,"focus",function(){j.selection.moveToBookmark(j.bookmark);j.bookmark=null})})}if(k.hideMenu){j.onMouseDown.add(k.hideMenu,k)}return l.add(k)},createButton:function(m,i,l){var h=this,g=h.editor,j,k,f;if(h.get(m)){return null}i.title=g.translate(i.title);i.label=g.translate(i.label);i.scope=i.scope||g;if(!i.onclick&&!i.menu_button){i.onclick=function(){g.execCommand(i.cmd,i.ui||false,i.value)}}i=e({title:i.title,"class":"mce_"+m,unavailable_prefix:g.getLang("unavailable",""),scope:i.scope,control_manager:h},i);m=h.prefix+m;if(i.menu_button){f=l||h._cls.menubutton||c.ui.MenuButton;k=new f(m,i,g);g.onMouseDown.add(k.hideMenu,k)}else{f=h._cls.button||c.ui.Button;k=new f(m,i,g)}return h.add(k)},createMenuButton:function(h,f,g){f=f||{};f.menu_button=1;return this.createButton(h,f,g)},createSplitButton:function(m,i,l){var h=this,g=h.editor,j,k,f;if(h.get(m)){return null}i.title=g.translate(i.title);i.scope=i.scope||g;if(!i.onclick){i.onclick=function(n){g.execCommand(i.cmd,i.ui||false,n||i.value)}}if(!i.onselect){i.onselect=function(n){g.execCommand(i.cmd,i.ui||false,n||i.value)}}i=e({title:i.title,"class":"mce_"+m,scope:i.scope,control_manager:h},i);m=h.prefix+m;f=l||h._cls.splitbutton||c.ui.SplitButton;k=h.add(new f(m,i,g));g.onMouseDown.add(k.hideMenu,k);return k},createColorSplitButton:function(f,n,h){var l=this,j=l.editor,i,k,m,g;if(l.get(f)){return null}n.title=j.translate(n.title);n.scope=n.scope||j;if(!n.onclick){n.onclick=function(o){if(c.isIE){g=j.selection.getBookmark(1)}j.execCommand(n.cmd,n.ui||false,o||n.value)}}if(!n.onselect){n.onselect=function(o){j.execCommand(n.cmd,n.ui||false,o||n.value)}}n=e({title:n.title,"class":"mce_"+f,menu_class:j.getParam("skin")+"Skin",scope:n.scope,more_colors_title:j.getLang("more_colors")},n);f=l.prefix+f;m=h||l._cls.colorsplitbutton||c.ui.ColorSplitButton;k=new m(f,n,j);j.onMouseDown.add(k.hideMenu,k);j.onRemove.add(function(){k.destroy()});if(c.isIE){k.onShowMenu.add(function(){j.focus();g=j.selection.getBookmark(1)});k.onHideMenu.add(function(){if(g){j.selection.moveToBookmark(g);g=0}})}return l.add(k)},createToolbar:function(k,h,j){var i,g=this,f;k=g.prefix+k;f=j||g._cls.toolbar||c.ui.Toolbar;i=new f(k,h,g.editor);if(g.get(k)){return null}return g.add(i)},createToolbarGroup:function(k,h,j){var i,g=this,f;k=g.prefix+k;f=j||this._cls.toolbarGroup||c.ui.ToolbarGroup;i=new f(k,h,g.editor);if(g.get(k)){return null}return g.add(i)},createSeparator:function(g){var f=g||this._cls.separator||c.ui.Separator;return new f()},setControlType:function(g,f){return this._cls[g.toLowerCase()]=f},destroy:function(){d(this.controls,function(f){f.destroy()});this.controls=null}})})(tinymce);(function(d){var a=d.util.Dispatcher,e=d.each,c=d.isIE,b=d.isOpera;d.create("tinymce.WindowManager",{WindowManager:function(f){var g=this;g.editor=f;g.onOpen=new a(g);g.onClose=new a(g);g.params={};g.features={}},open:function(z,h){var v=this,k="",n,m,i=v.editor.settings.dialog_type=="modal",q,o,j,g=d.DOM.getViewPort(),r;z=z||{};h=h||{};o=b?g.w:screen.width;j=b?g.h:screen.height;z.name=z.name||"mc_"+new Date().getTime();z.width=parseInt(z.width||320);z.height=parseInt(z.height||240);z.resizable=true;z.left=z.left||parseInt(o/2)-(z.width/2);z.top=z.top||parseInt(j/2)-(z.height/2);h.inline=false;h.mce_width=z.width;h.mce_height=z.height;h.mce_auto_focus=z.auto_focus;if(i){if(c){z.center=true;z.help=false;z.dialogWidth=z.width+"px";z.dialogHeight=z.height+"px";z.scroll=z.scrollbars||false}}e(z,function(p,f){if(d.is(p,"boolean")){p=p?"yes":"no"}if(!/^(name|url)$/.test(f)){if(c&&i){k+=(k?";":"")+f+":"+p}else{k+=(k?",":"")+f+"="+p}}});v.features=z;v.params=h;v.onOpen.dispatch(v,z,h);r=z.url||z.file;r=d._addVer(r);try{if(c&&i){q=1;window.showModalDialog(r,window,k)}else{q=window.open(r,z.name,k)}}catch(l){}if(!q){alert(v.editor.getLang("popup_blocked"))}},close:function(f){f.close();this.onClose.dispatch(this)},createInstance:function(i,h,g,m,l,k){var j=d.resolve(i);return new j(h,g,m,l,k)},confirm:function(h,f,i,g){g=g||window;f.call(i||this,g.confirm(this._decode(this.editor.getLang(h,h))))},alert:function(h,f,j,g){var i=this;g=g||window;g.alert(i._decode(i.editor.getLang(h,h)));if(f){f.call(j||i)}},resizeBy:function(f,g,h){h.resizeBy(f,g)},_decode:function(f){return d.DOM.decode(f).replace(/\\n/g,"\n")}})}(tinymce));(function(a){a.Formatter=function(V){var M={},O=a.each,c=V.dom,q=V.selection,t=a.dom.TreeWalker,K=new a.dom.RangeUtils(c),d=V.schema.isValidChild,F=c.isBlock,l=V.settings.forced_root_block,s=c.nodeIndex,E="\uFEFF",e=/^(src|href|style)$/,S=false,B=true,p,P={apply:[],remove:[]};function z(W){return W instanceof Array}function m(X,W){return c.getParents(X,W,c.getRoot())}function b(W){return W.nodeType===1&&(W.face==="mceinline"||W.style.fontFamily==="mceinline")}function R(W){return W?M[W]:M}function k(W,X){if(W){if(typeof(W)!=="string"){O(W,function(Z,Y){k(Y,Z)})}else{X=X.length?X:[X];O(X,function(Y){if(Y.deep===p){Y.deep=!Y.selector}if(Y.split===p){Y.split=!Y.selector||Y.inline}if(Y.remove===p&&Y.selector&&!Y.inline){Y.remove="none"}if(Y.selector&&Y.inline){Y.mixed=true;Y.block_expand=true}if(typeof(Y.classes)==="string"){Y.classes=Y.classes.split(/\s+/)}});M[W]=X}}}var i=function(X){var W;V.dom.getParent(X,function(Y){W=V.dom.getStyle(Y,"text-decoration");return W&&W!=="none"});return W};var I=function(W){var X;if(W.nodeType===1&&W.parentNode&&W.parentNode.nodeType===1){X=i(W.parentNode);if(V.dom.getStyle(W,"color")&&X){V.dom.setStyle(W,"text-decoration",X)}else{if(V.dom.getStyle(W,"textdecoration")===X){V.dom.setStyle(W,"text-decoration",null)}}}};function T(Z,ah,ac){var ad=R(Z),ai=ad[0],ag,X,af,ae=q.isCollapsed();function aa(am){var al=am.startContainer,ap=am.startOffset,ao,an;if(al.nodeType==1||al.nodeValue===""){al=al.nodeType==1?al.childNodes[ap]:al;if(al){ao=new t(al,al.parentNode);for(an=ao.current();an;an=ao.next()){if(an.nodeType==3&&!f(an)){am.setStart(an,0);break}}}}return am}function W(am,al){al=al||ai;if(am){if(al.onformat){al.onformat(am,al,ah,ac)}O(al.styles,function(ao,an){c.setStyle(am,an,r(ao,ah))});O(al.attributes,function(ao,an){c.setAttrib(am,an,r(ao,ah))});O(al.classes,function(an){an=r(an,ah);if(!c.hasClass(am,an)){c.addClass(am,an)}})}}function ab(){function an(au,ar){var at=new t(ar);for(ac=at.current();ac;ac=at.prev()){if(ac.childNodes.length>1||ac==au){return ac}}}var am=V.selection.getRng();var aq=am.startContainer;var al=am.endContainer;if(aq!=al&&am.endOffset==0){var ap=an(aq,al);var ao=ap.nodeType==3?ap.length:ap.childNodes.length;am.setEnd(ap,ao)}return am}function Y(ao,au,ar,aq,am){var al=[],an=-1,at,aw=-1,ap=-1,av;O(ao.childNodes,function(ay,ax){if(ay.nodeName==="UL"||ay.nodeName==="OL"){an=ax;at=ay;return false}});O(ao.childNodes,function(ay,ax){if(ay.nodeName==="SPAN"&&c.getAttrib(ay,"data-mce-type")=="bookmark"){if(ay.id==au.id+"_start"){aw=ax}else{if(ay.id==au.id+"_end"){ap=ax}}}});if(an<=0||(aw<an&&ap>an)){O(a.grep(ao.childNodes),am);return 0}else{av=ar.cloneNode(S);O(a.grep(ao.childNodes),function(ay,ax){if((aw<an&&ax<an)||(aw>an&&ax>an)){al.push(ay);ay.parentNode.removeChild(ay)}});if(aw<an){ao.insertBefore(av,at)}else{if(aw>an){ao.insertBefore(av,at.nextSibling)}}aq.push(av);O(al,function(ax){av.appendChild(ax)});return av}}function aj(am,ao){var al=[],ap,an;ap=ai.inline||ai.block;an=c.create(ap);W(an);K.walk(am,function(aq){var ar;function at(au){var ax=au.nodeName.toLowerCase(),aw=au.parentNode.nodeName.toLowerCase(),av;if(g(ax,"br")){ar=0;if(ai.block){c.remove(au)}return}if(ai.wrapper&&x(au,Z,ah)){ar=0;return}if(ai.block&&!ai.wrapper&&G(ax)){au=c.rename(au,ap);W(au);al.push(au);ar=0;return}if(ai.selector){O(ad,function(ay){if("collapsed" in ay&&ay.collapsed!==ae){return}if(c.is(au,ay.selector)&&!b(au)){W(au,ay);av=true}});if(!ai.inline||av){ar=0;return}}if(d(ap,ax)&&d(aw,ap)&&!(au.nodeType===3&&au.nodeValue.length===1&&au.nodeValue.charCodeAt(0)===65279)){if(!ar){ar=an.cloneNode(S);au.parentNode.insertBefore(ar,au);al.push(ar)}ar.appendChild(au)}else{if(ax=="li"&&ao){ar=Y(au,ao,an,al,at)}else{ar=0;O(a.grep(au.childNodes),at);ar=0}}}O(aq,at)});if(ai.wrap_links===false){O(al,function(aq){function ar(aw){var av,au,at;if(aw.nodeName==="A"){au=an.cloneNode(S);al.push(au);at=a.grep(aw.childNodes);for(av=0;av<at.length;av++){au.appendChild(at[av])}aw.appendChild(au)}O(a.grep(aw.childNodes),ar)}ar(aq)})}O(al,function(at){var aq;function au(aw){var av=0;O(aw.childNodes,function(ax){if(!f(ax)&&!H(ax)){av++}});return av}function ar(av){var ax,aw;O(av.childNodes,function(ay){if(ay.nodeType==1&&!H(ay)&&!b(ay)){ax=ay;return S}});if(ax&&h(ax,ai)){aw=ax.cloneNode(S);W(aw);c.replace(aw,av,B);c.remove(ax,1)}return aw||av}aq=au(at);if((al.length>1||!F(at))&&aq===0){c.remove(at,1);return}if(ai.inline||ai.wrapper){if(!ai.exact&&aq===1){at=ar(at)}O(ad,function(av){O(c.select(av.inline,at),function(ax){var aw;if(av.wrap_links===false){aw=ax.parentNode;do{if(aw.nodeName==="A"){return}}while(aw=aw.parentNode)}U(av,ah,ax,av.exact?ax:null)})});if(x(at.parentNode,Z,ah)){c.remove(at,1);at=0;return B}if(ai.merge_with_parents){c.getParent(at.parentNode,function(av){if(x(av,Z,ah)){c.remove(at,1);at=0;return B}})}if(at&&ai.merge_siblings!==false){at=u(C(at),at);at=u(at,C(at,B))}}})}if(ai){if(ac){X=c.createRng();X.setStartBefore(ac);X.setEndAfter(ac);aj(o(X,ad))}else{if(!ae||!ai.inline||c.select("td.mceSelected,th.mceSelected").length){var ak=V.selection.getNode();V.selection.setRng(ab());ag=q.getBookmark();aj(o(q.getRng(B),ad),ag);if(ai.styles&&(ai.styles.color||ai.styles.textDecoration)){a.walk(ak,I,"childNodes");I(ak)}q.moveToBookmark(ag);q.setRng(aa(q.getRng(B)));V.nodeChanged()}else{Q("apply",Z,ah)}}}}function A(Y,ah,ab){var ac=R(Y),aj=ac[0],ag,af,X;function aa(am){var al=am.startContainer,ar=am.startOffset,aq,ap,an,ao;if(al.nodeType==3&&ar>=al.nodeValue.length-1){al=al.parentNode;ar=s(al)+1}if(al.nodeType==1){an=al.childNodes;al=an[Math.min(ar,an.length-1)];aq=new t(al);if(ar>an.length-1){aq.next()}for(ap=aq.current();ap;ap=aq.next()){if(ap.nodeType==3&&!f(ap)){ao=c.create("a",null,E);ap.parentNode.insertBefore(ao,ap);am.setStart(ap,0);q.setRng(am);c.remove(ao);return}}}}function Z(ao){var an,am,al;an=a.grep(ao.childNodes);for(am=0,al=ac.length;am<al;am++){if(U(ac[am],ah,ao,ao)){break}}if(aj.deep){for(am=0,al=an.length;am<al;am++){Z(an[am])}}}function ad(al){var am;O(m(al.parentNode).reverse(),function(an){var ao;if(!am&&an.id!="_start"&&an.id!="_end"){ao=x(an,Y,ah);if(ao&&ao.split!==false){am=an}}});return am}function W(ao,al,aq,au){var av,at,ar,an,ap,am;if(ao){am=ao.parentNode;for(av=al.parentNode;av&&av!=am;av=av.parentNode){at=av.cloneNode(S);for(ap=0;ap<ac.length;ap++){if(U(ac[ap],ah,at,at)){at=0;break}}if(at){if(ar){at.appendChild(ar)}if(!an){an=at}ar=at}}if(au&&(!aj.mixed||!F(ao))){al=c.split(ao,al)}if(ar){aq.parentNode.insertBefore(ar,aq);an.appendChild(aq)}}return al}function ai(al){return W(ad(al),al,al,true)}function ae(an){var am=c.get(an?"_start":"_end"),al=am[an?"firstChild":"lastChild"];if(H(al)){al=al[an?"firstChild":"lastChild"]}c.remove(am,true);return al}function ak(al){var am,an;al=o(al,ac,B);if(aj.split){am=J(al,B);an=J(al);if(am!=an){am=N(am,"span",{id:"_start","data-mce-type":"bookmark"});an=N(an,"span",{id:"_end","data-mce-type":"bookmark"});ai(am);ai(an);am=ae(B);an=ae()}else{am=an=ai(am)}al.startContainer=am.parentNode;al.startOffset=s(am);al.endContainer=an.parentNode;al.endOffset=s(an)+1}K.walk(al,function(ao){O(ao,function(ap){Z(ap);if(ap.nodeType===1&&V.dom.getStyle(ap,"text-decoration")==="underline"&&ap.parentNode&&i(ap.parentNode)==="underline"){U({deep:false,exact:true,inline:"span",styles:{textDecoration:"underline"}},null,ap)}})})}if(ab){X=c.createRng();X.setStartBefore(ab);X.setEndAfter(ab);ak(X);return}if(!q.isCollapsed()||!aj.inline||c.select("td.mceSelected,th.mceSelected").length){ag=q.getBookmark();ak(q.getRng(B));q.moveToBookmark(ag);if(aj.inline&&j(Y,ah,q.getStart())){aa(q.getRng(true))}V.nodeChanged()}else{Q("remove",Y,ah)}}function D(X,Z,Y){var W=R(X);if(j(X,Z,Y)&&(!("toggle" in W[0])||W[0]["toggle"])){A(X,Z,Y)}else{T(X,Z,Y)}}function x(X,W,ac,aa){var Y=R(W),ad,ab,Z;function ae(ai,ak,al){var ah,aj,af=ak[al],ag;if(ak.onmatch){return ak.onmatch(ai,ak,al)}if(af){if(af.length===p){for(ah in af){if(af.hasOwnProperty(ah)){if(al==="attributes"){aj=c.getAttrib(ai,ah)}else{aj=L(ai,ah)}if(aa&&!aj&&!ak.exact){return}if((!aa||ak.exact)&&!g(aj,r(af[ah],ac))){return}}}}else{for(ag=0;ag<af.length;ag++){if(al==="attributes"?c.getAttrib(ai,af[ag]):L(ai,af[ag])){return ak}}}}return ak}if(Y&&X){for(ab=0;ab<Y.length;ab++){ad=Y[ab];if(h(X,ad)&&ae(X,ad,"attributes")&&ae(X,ad,"styles")){if(Z=ad.classes){for(ab=0;ab<Z.length;ab++){if(!c.hasClass(X,Z[ab])){return}}}return ad}}}}function j(Y,ab,aa){var X,Z;function W(ac){ac=c.getParent(ac,function(ad){return !!x(ad,Y,ab,true)});return x(ac,Y,ab)}if(aa){return W(aa)}if(q.isCollapsed()){for(Z=P.apply.length-1;Z>=0;Z--){if(P.apply[Z].name==Y){return true}}for(Z=P.remove.length-1;Z>=0;Z--){if(P.remove[Z].name==Y){return false}}return W(q.getNode())}aa=q.getNode();if(W(aa)){return B}X=q.getStart();if(X!=aa){if(W(X)){return B}}return S}function v(ad,ac){var aa,ab=[],Z={},Y,X,W;if(q.isCollapsed()){for(X=0;X<ad.length;X++){for(Y=P.remove.length-1;Y>=0;Y--){W=ad[X];if(P.remove[Y].name==W){Z[W]=true;break}}}for(Y=P.apply.length-1;Y>=0;Y--){for(X=0;X<ad.length;X++){W=ad[X];if(!Z[W]&&P.apply[Y].name==W){Z[W]=true;ab.push(W)}}}}aa=q.getStart();c.getParent(aa,function(ag){var af,ae;for(af=0;af<ad.length;af++){ae=ad[af];if(!Z[ae]&&x(ag,ae,ac)){Z[ae]=true;ab.push(ae)}}});return ab}function y(aa){var ac=R(aa),Z,Y,ab,X,W;if(ac){Z=q.getStart();Y=m(Z);for(X=ac.length-1;X>=0;X--){W=ac[X].selector;if(!W){return B}for(ab=Y.length-1;ab>=0;ab--){if(c.is(Y[ab],W)){return B}}}}return S}a.extend(this,{get:R,register:k,apply:T,remove:A,toggle:D,match:j,matchAll:v,matchNode:x,canApply:y});function h(W,X){if(g(W,X.inline)){return B}if(g(W,X.block)){return B}if(X.selector){return c.is(W,X.selector)}}function g(X,W){X=X||"";W=W||"";X=""+(X.nodeName||X);W=""+(W.nodeName||W);return X.toLowerCase()==W.toLowerCase()}function L(X,W){var Y=c.getStyle(X,W);if(W=="color"||W=="backgroundColor"){Y=c.toHex(Y)}if(W=="fontWeight"&&Y==700){Y="bold"}return""+Y}function r(W,X){if(typeof(W)!="string"){W=W(X)}else{if(X){W=W.replace(/%(\w+)/g,function(Z,Y){return X[Y]||Z})}}return W}function f(W){return W&&W.nodeType===3&&/^([\s\r\n]+|)$/.test(W.nodeValue)}function N(Y,X,W){var Z=c.create(X,W);Y.parentNode.insertBefore(Z,Y);Z.appendChild(Y);return Z}function o(W,ag,Z){var Y=W.startContainer,ad=W.startOffset,aj=W.endContainer,ae=W.endOffset,ai,af,ac;function ah(am,an,ak,al){var ao,ap;al=al||c.getRoot();for(;;){ao=am.parentNode;if(ao==al||(!ag[0].block_expand&&F(ao))){return am}for(ai=ao[an];ai&&ai!=am;ai=ai[ak]){if(ai.nodeType==1&&!H(ai)){return am}if(ai.nodeType==3&&!f(ai)){return am}}am=am.parentNode}return am}function ab(ak,al){if(al===p){al=ak.nodeType===3?ak.length:ak.childNodes.length}while(ak&&ak.hasChildNodes()){ak=ak.childNodes[al];if(ak){al=ak.nodeType===3?ak.length:ak.childNodes.length}}return{node:ak,offset:al}}if(Y.nodeType==1&&Y.hasChildNodes()){af=Y.childNodes.length-1;Y=Y.childNodes[ad>af?af:ad];if(Y.nodeType==3){ad=0}}if(aj.nodeType==1&&aj.hasChildNodes()){af=aj.childNodes.length-1;aj=aj.childNodes[ae>af?af:ae-1];if(aj.nodeType==3){ae=aj.nodeValue.length}}if(H(Y.parentNode)){Y=Y.parentNode}if(H(Y)){Y=Y.nextSibling||Y}if(H(aj.parentNode)){ae=c.nodeIndex(aj);aj=aj.parentNode}if(H(aj)&&aj.previousSibling){aj=aj.previousSibling;ae=aj.length}if(ag[0].inline){ac=ab(aj,ae);if(ac.node){while(ac.node&&ac.offset===0&&ac.node.previousSibling){ac=ab(ac.node.previousSibling)}if(ac.node&&ac.offset>0&&ac.node.nodeType===3&&ac.node.nodeValue.charAt(ac.offset-1)===" "){if(ac.offset>1){aj=ac.node;aj.splitText(ac.offset-1)}else{if(ac.node.previousSibling){aj=ac.node.previousSibling}}}}}if(ag[0].inline||ag[0].block_expand){Y=ah(Y,"firstChild","nextSibling");aj=ah(aj,"lastChild","previousSibling")}if(ag[0].selector&&ag[0].expand!==S&&!ag[0].inline){function aa(al,ak){var am,an,ap,ao;if(al.nodeType==3&&al.nodeValue.length==0&&al[ak]){al=al[ak]}am=m(al);for(an=0;an<am.length;an++){for(ap=0;ap<ag.length;ap++){ao=ag[ap];if("collapsed" in ao&&ao.collapsed!==W.collapsed){continue}if(c.is(am[an],ao.selector)){return am[an]}}}return al}Y=aa(Y,"previousSibling");aj=aa(aj,"nextSibling")}if(ag[0].block||ag[0].selector){function X(al,ak,an){var am;if(!ag[0].wrapper){am=c.getParent(al,ag[0].block)}if(!am){am=c.getParent(al.nodeType==3?al.parentNode:al,F)}if(am&&ag[0].wrapper){am=m(am,"ul,ol").reverse()[0]||am}if(!am){am=al;while(am[ak]&&!F(am[ak])){am=am[ak];if(g(am,"br")){break}}}return am||al}Y=X(Y,"previousSibling");aj=X(aj,"nextSibling");if(ag[0].block){if(!F(Y)){Y=ah(Y,"firstChild","nextSibling")}if(!F(aj)){aj=ah(aj,"lastChild","previousSibling")}}}if(Y.nodeType==1){ad=s(Y);Y=Y.parentNode}if(aj.nodeType==1){ae=s(aj)+1;aj=aj.parentNode}return{startContainer:Y,startOffset:ad,endContainer:aj,endOffset:ae}}function U(ac,ab,Z,W){var Y,X,aa;if(!h(Z,ac)){return S}if(ac.remove!="all"){O(ac.styles,function(ae,ad){ae=r(ae,ab);if(typeof(ad)==="number"){ad=ae;W=0}if(!W||g(L(W,ad),ae)){c.setStyle(Z,ad,"")}aa=1});if(aa&&c.getAttrib(Z,"style")==""){Z.removeAttribute("style");Z.removeAttribute("data-mce-style")}O(ac.attributes,function(af,ad){var ae;af=r(af,ab);if(typeof(ad)==="number"){ad=af;W=0}if(!W||g(c.getAttrib(W,ad),af)){if(ad=="class"){af=c.getAttrib(Z,ad);if(af){ae="";O(af.split(/\s+/),function(ag){if(/mce\w+/.test(ag)){ae+=(ae?" ":"")+ag}});if(ae){c.setAttrib(Z,ad,ae);return}}}if(ad=="class"){Z.removeAttribute("className")}if(e.test(ad)){Z.removeAttribute("data-mce-"+ad)}Z.removeAttribute(ad)}});O(ac.classes,function(ad){ad=r(ad,ab);if(!W||c.hasClass(W,ad)){c.removeClass(Z,ad)}});X=c.getAttribs(Z);for(Y=0;Y<X.length;Y++){if(X[Y].nodeName.indexOf("_")!==0){return S}}}if(ac.remove!="none"){n(Z,ac);return B}}function n(Y,Z){var W=Y.parentNode,X;if(Z.block){if(!l){function aa(ac,ab,ad){ac=C(ac,ab,ad);return !ac||(ac.nodeName=="BR"||F(ac))}if(F(Y)&&!F(W)){if(!aa(Y,S)&&!aa(Y.firstChild,B,1)){Y.insertBefore(c.create("br"),Y.firstChild)}if(!aa(Y,B)&&!aa(Y.lastChild,S,1)){Y.appendChild(c.create("br"))}}}else{if(W==c.getRoot()){if(!Z.list_block||!g(Y,Z.list_block)){O(a.grep(Y.childNodes),function(ab){if(d(l,ab.nodeName.toLowerCase())){if(!X){X=N(ab,l)}else{X.appendChild(ab)}}else{X=0}})}}}}if(Z.selector&&Z.inline&&!g(Z.inline,Y)){return}c.remove(Y,1)}function C(X,W,Y){if(X){W=W?"nextSibling":"previousSibling";for(X=Y?X:X[W];X;X=X[W]){if(X.nodeType==1||!f(X)){return X}}}}function H(W){return W&&W.nodeType==1&&W.getAttribute("data-mce-type")=="bookmark"}function u(aa,Z){var W,Y,X;function ac(af,ae){if(af.nodeName!=ae.nodeName){return S}function ad(ah){var ai={};O(c.getAttribs(ah),function(aj){var ak=aj.nodeName.toLowerCase();if(ak.indexOf("_")!==0&&ak!=="style"){ai[ak]=c.getAttrib(ah,ak)}});return ai}function ag(ak,aj){var ai,ah;for(ah in ak){if(ak.hasOwnProperty(ah)){ai=aj[ah];if(ai===p){return S}if(ak[ah]!=ai){return S}delete aj[ah]}}for(ah in aj){if(aj.hasOwnProperty(ah)){return S}}return B}if(!ag(ad(af),ad(ae))){return S}if(!ag(c.parseStyle(c.getAttrib(af,"style")),c.parseStyle(c.getAttrib(ae,"style")))){return S}return B}if(aa&&Z){function ab(ae,ad){for(Y=ae;Y;Y=Y[ad]){if(Y.nodeType==3&&Y.nodeValue.length!==0){return ae}if(Y.nodeType==1&&!H(Y)){return Y}}return ae}aa=ab(aa,"previousSibling");Z=ab(Z,"nextSibling");if(ac(aa,Z)){for(Y=aa.nextSibling;Y&&Y!=Z;){X=Y;Y=Y.nextSibling;aa.appendChild(X)}c.remove(Z);O(a.grep(Z.childNodes),function(ad){aa.appendChild(ad)});return aa}}return Z}function G(W){return/^(h[1-6]|p|div|pre|address|dl|dt|dd)$/.test(W)}function J(X,aa){var W,Z,Y;W=X[aa?"startContainer":"endContainer"];Z=X[aa?"startOffset":"endOffset"];if(W.nodeType==1){Y=W.childNodes.length-1;if(!aa&&Z){Z--}W=W.childNodes[Z>Y?Y:Z]}return W}function Q(ad,Y,ac){var aa,X=P[ad],ae=P[ad=="apply"?"remove":"apply"];function af(){return P.apply.length||P.remove.length}function ab(){P.apply=[];P.remove=[]}function ag(ah){O(P.apply.reverse(),function(ai){T(ai.name,ai.vars,ah);if(ai.name==="forecolor"&&ai.vars.value){I(ah.parentNode)}});O(P.remove.reverse(),function(ai){A(ai.name,ai.vars,ah)});c.remove(ah,1);ab()}for(aa=X.length-1;aa>=0;aa--){if(X[aa].name==Y){return}}X.push({name:Y,vars:ac});for(aa=ae.length-1;aa>=0;aa--){if(ae[aa].name==Y){ae.splice(aa,1)}}if(af()){V.getDoc().execCommand("FontName",false,"mceinline");P.lastRng=q.getRng();O(c.select("font,span"),function(ai){var ah;if(b(ai)){ah=q.getBookmark();ag(ai);q.moveToBookmark(ah);V.nodeChanged()}});if(!P.isListening&&af()){P.isListening=true;function W(ai,aj){var ah=c.createRng();ag(ai);ah.setStart(aj,aj.nodeValue.length);ah.setEnd(aj,aj.nodeValue.length);q.setRng(ah);V.nodeChanged()}var Z=false;O("onKeyDown,onKeyUp,onKeyPress,onMouseUp".split(","),function(ah){V[ah].addToTop(function(ai,al){if(al.keyCode==13&&!al.shiftKey){Z=true;return}if(af()&&!a.dom.RangeUtils.compareRanges(P.lastRng,q.getRng())){var aj=false;O(c.select("font,span"),function(ao){var ap,an;if(b(ao)){aj=true;ap=ao.firstChild;while(ap&&ap.nodeType!=3){ap=ap.firstChild}if(ap){W(ao,ap)}else{c.remove(ao)}}});if(Z&&!aj){var ak=q.getNode();var am=ak;while(am&&am.nodeType!=3){am=am.firstChild}if(am){ak=am.parentNode;while(!F(ak)){ak=ak.parentNode}W(ak,am)}}if(al.type=="keyup"||al.type=="mouseup"){ab();Z=false}}})})}}}}})(tinymce);tinymce.onAddEditor.add(function(e,a){var d,h,g,c=a.settings;if(c.inline_styles){h=e.explode(c.font_size_style_values);function b(j,i){e.each(i,function(l,k){if(l){g.setStyle(j,k,l)}});g.rename(j,"span")}d={font:function(j,i){b(i,{backgroundColor:i.style.backgroundColor,color:i.color,fontFamily:i.face,fontSize:h[parseInt(i.size)-1]})},u:function(j,i){b(i,{textDecoration:"underline"})},strike:function(j,i){b(i,{textDecoration:"line-through"})}};function f(i,j){g=i.dom;if(c.convert_fonts_to_spans){e.each(g.select("font,u,strike",j.node),function(k){d[k.nodeName.toLowerCase()](a.dom,k)})}}a.onPreProcess.add(f);a.onSetContent.add(f);a.onInit.add(function(){a.selection.onSetContent.add(f)})}});
define("mosaic.tinymce", function(){});

/**
 * This plugin is used to create a mosaic layout.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the layout namespace
    $.mosaic.layout = {
        widthClasses: ['mosaic-width-quarter', 'mosaic-width-third',
                       'mosaic-width-half', 'mosaic-width-two-thirds',
                       'mosaic-width-three-quarters', 'mosaic-width-full'],
        positionClasses: ['mosaic-position-leftmost', 'mosaic-position-quarter',
                          'mosaic-position-third', 'mosaic-position-half',
                          'mosaic-position-two-thirds',
                          'mosaic-position-three-quarters']
    };

    /**
    * Create a new instance of a mosaic layout.
    *
    * @constructor
    * @id jQuery.fn.mosaicLayout
    * @return {Object} Returns a new mosaic layout object.
    */
    $.fn.mosaicLayout = function () {

        // Keydown handler
        var DocumentKeydown = function (e) {

            // Check if esc
            if (e.keyCode === 27) {

                // Check if dragging
                var original_tile = $(".mosaic-original-tile", $.mosaic.document);
                if (original_tile.length > 0) {
                    original_tile.each(function () {
                        $(this).addClass("mosaic-drag-cancel");
                        if ($(this).hasClass("mosaic-helper-tile-new")) {
                            $(document).trigger("mousedown");
                        } else {
                            $(document).trigger("mouseup");
                        }
                    });

                // Deselect tile
                } else {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }

                // Find resize helper
                $(".mosaic-resize-handle-helper",
                  $.mosaic.document).each(function () {

                    // Remove resizing state
                    $(this).parents("[data-panel]")
                        .removeClass("mosaic-panel-resizing");
                    $(this).parent().removeClass("mosaic-row-resizing");
                    $(this).parent().children(".mosaic-resize-placeholder")
                        .remove();

                    // Remove helper
                    $(this).remove();
                });

                // Hide overlay
                $.mosaic.overlay.close();
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('keydown', DocumentKeydown);

        // Add deselect
        var DocumentMousedown = function (e) {

            // Get element
            var elm;
            if (e.target) {
                elm = e.target;
            } else if (e.srcElement) {
                elm = e.srcElement;
            }

            // If clicked outside a tile
            if ($(elm).parents(".mosaic-tile").length === 0) {

                // Check if outside toolbar
                if ($(elm).parents(".mosaic-toolbar").length === 0) {

                    // Deselect tiles
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .removeClass("mosaic-selected-tile")
                        .children(".mosaic-tile-content").blur();

                    // Set actions
                    $.mosaic.options.toolbar.trigger("selectedtilechange");
                    $.mosaic.options.panels.mosaicSetResizeHandleLocation();
                }
            }

            // Find resize helper
            var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document);
            if (new_tile.length > 0) {
                new_tile.each(function () {

                    // Handle drag end
                    $(this).mosaicHandleDragEnd();
                });
            }
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousedown', DocumentMousedown);

        // Handle mouse move event
        var DocumentMousemove = function (e) {

            // Find resize helper
            $(".mosaic-helper-tile-new", $.mosaic.document).each(function () {

                // Get offset
                var offset = $(this).parent().offset();

                // Get mouse x
                $(this).css("top", e.pageY + 3 - offset.top);
                $(this).css("left", e.pageX + 3 - offset.left);
            });

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

                var cur_snap_offset;

                // Get helper
                var helper = $(this);

                // Get row
                var row = helper.parent();

                // Get mouse x
                var mouse_x = parseFloat(e.pageX - row.offset().left - 4);

                // Get mouse percentage
                var mouse_percentage = (mouse_x / helper.data("row_width")) * 100;

                // Get closest snap location
                var snap = 25;
                var snap_offset = 1000;
                $([25, 33, 50, 67, 75]).each(function () {
                    cur_snap_offset = Math.abs(this - mouse_percentage);
                    if (cur_snap_offset < snap_offset) {
                        snap = this;
                        snap_offset = cur_snap_offset;
                    }
                });

                // If 2 columns
                if (helper.data("nr_of_columns") === 2) {

                    // Check if resize
                    if (helper.data("column_sizes").split(" ")[0] !== snap) {

                        // Loop through columns
                        row.children(".mosaic-resize-placeholder").each(function (i) {

                            // First column
                            if (i === 0) {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(snap, 10)));

                            // Second column
                            } else {

                                // Set new width and position
                                $(this)
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .removeClass($.mosaic.layout.widthClasses.join(" "))
                                    .addClass(GetWidthClassByInt(parseInt(100 - snap, 10)))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                                // Set helper
                                helper
                                    .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                    .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));
                            }
                        });

                        // Set new size
                        $(this).data("column_sizes", snap + " " + (100 - snap));
                    }

                // Else 3 columns
                } else {

                    // Get resize handle index
                    var resize_handle_index = $(this).data("resize_handle_index");

                    // Check if first resize handle
                    if (resize_handle_index === 1) {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index") - 1] !== snap) && (parseInt(snap, 10) <= 50)) {

                            // Get columns
                            var columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 25:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            case 33:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(1)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "50 25 25");
                                break;
                            }
                        }

                    // Else second resize handle
                    } else {

                        // Check if resize
                        if ((helper.data("column_sizes").split(" ")[$(this).data("resize_handle_index")] !== (100 - snap)) && (parseInt(snap, 10) >= 50)) {

                            // Get columns
                            var columns = row.children(".mosaic-resize-placeholder");

                            // Remove position and width classes
                            columns
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .removeClass($.mosaic.layout.widthClasses.join(" "));
                            helper
                                .removeClass($.mosaic.layout.positionClasses.join(" ").replace(/position/g, "resize"))
                                .addClass(GetPositionClassByInt(parseInt(snap, 10)).replace("position", "resize"));

                            // Get layout
                            switch (parseInt(snap, 10)) {
                            case 50:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(2)).addClass(GetPositionClassByInt(50).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                helper.data("column_sizes", "25 25 50");
                                break;
                            case 66:
                            case 67:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(1)).addClass(GetPositionClassByInt(33).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                $(columns.get(2)).addClass(GetPositionClassByInt(66).replace("position", "resize") + " " + GetWidthClassByInt(33));
                                helper.data("column_sizes", "33 33 33");
                                break;
                            case 75:
                                $(columns.get(0)).addClass(GetPositionClassByInt(0).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                $(columns.get(1)).addClass(GetPositionClassByInt(25).replace("position", "resize") + " " + GetWidthClassByInt(50));
                                $(columns.get(2)).addClass(GetPositionClassByInt(75).replace("position", "resize") + " " + GetWidthClassByInt(25));
                                helper.data("column_sizes", "25 50 25");
                                break;
                            }
                        }
                    }
                }
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mousemove', DocumentMousemove);
        $($.mosaic.document).bind('dragover', DocumentMousemove);

        // Handle mouse up event
        var DocumentMouseup = function (e) {

            // Find resize helper
            $(".mosaic-resize-handle-helper", $.mosaic.document).each(function () {

                // Get panel
                var panel = $(this).parents("[data-panel]");

                // Get column sizes
                var column_sizes = $(this).data("column_sizes").split(" ");

                // Set column sizes
                $(this).parent().children(".mosaic-grid-cell").each(function (i) {
                    var offset_x = 0;
                    for (var j = 0; j < i; j += 1) {
                        offset_x += parseInt(column_sizes[j], 10);
                    }
                    $(this)
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .addClass(GetPositionClassByInt(offset_x) + " " + GetWidthClassByInt(parseInt(column_sizes[i], 10)));
                });

                // Remove resizing state
                panel.removeClass("mosaic-panel-resizing");
                $(this).parent().removeClass("mosaic-row-resizing");
                $(this).parent().children(".mosaic-resize-placeholder").remove();

                // Set resize handles
                $(this).parent().mosaicSetResizeHandles();
                panel.mosaicSetResizeHandleLocation();
                panel.find(".mosaic-selected-tile").mosaicFocusTileContent();

                // Remove helper
                $(this).remove();
            });
        };

        // Bind event and add to array
        $($.mosaic.document).bind('mouseup', DocumentMouseup);

        // Handle mousemove on tile
        var TileMousemove = function (e) {

            // Check if dragging
            if ($(this).parents("[data-panel]").hasClass("mosaic-panel-dragging")) {

                // Hide all dividers
                $(".mosaic-selected-divider", $.mosaic.document)
                    .removeClass("mosaic-selected-divider");

                // Don't show dividers if above original or floating tile
                if (($(this).hasClass("mosaic-original-tile") === false) &&
                    ($(this).hasClass("mosaic-tile-align-left") === false) &&
                    ($(this).hasClass("mosaic-tile-align-right") === false)) {

                    // Get direction
                    var dir = $(this).mosaicGetDirection(e);
                    var divider = $(this).children(".mosaic-divider-" + dir);

                    // Check if left or right divider
                    if ((dir === "left") || (dir === "right")) {
                        var row = divider.parent().parent().parent();

                        // If row has multiple columns
                        if (row.children(".mosaic-grid-cell").length > 1) {
                            divider.height(row.height() + 5);
                            divider.css('top', (row.offset().top - divider.parent().offset().top) - 5);
                        } else {
                            divider.height(divider.parent().height() + 5);
                            divider.css('top', -5);
                        }
                    }

                    // Show divider
                    divider.addClass("mosaic-selected-divider");
                }
            }
        };

        // Bind events
        $(".mosaic-tile", $.mosaic.document).live("mousemove", TileMousemove);
        $(".mosaic-tile", $.mosaic.document).live("dragover", TileMousemove);

        // On click select the current tile
        $(".mosaic-tile", $.mosaic.document).live("click", function () {

            // Select tile
            $(this).mosaicSelectTile();
        });

        $(".mosaic-close-icon", $.mosaic.document).live("click", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if app tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();

                // Remove tags
                $.mosaic.removeHeadTags(tile_url);

                // Calc delete url
                var url = tile_url.split('?')[0];
                url = url.split('@@');
                var tile_type_id = url[1].split('/');
                url = url[0] + '@@delete-tile?type=' + tile_type_id[0] + '&id=' + tile_type_id[1] + '&confirm=true';

                // Ajax call to remove tile
                $.ajax({
                    type: "GET",
                    url: url,
                    success: function (value) {

/*
                        $.plone.notify({
                            title: "Info",
                            message: "Application tile removed",
                            sticky: false
                        });
*/
                    }
                });
            }

            // Remove empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Get original row
            var original_row = $(this).parents(".mosaic-tile").parent().parent();

            // Save tile value
            $.mosaic.saveTileValueToForm(tile_config.name, tile_config);

            // Remove current tile
            $(this).parent().remove();

            $.mosaic.undo.snapshot();

            // Cleanup original row
            original_row.mosaicCleanupRow();

            // Add empty rows
            $.mosaic.options.panels.mosaicAddEmptyRows();

            // Set toolbar
            $.mosaic.options.toolbar.trigger("selectedtilechange");
            $.mosaic.options.toolbar.mosaicSetResizeHandleLocation();
        });


        // On click open overlay
        $(".mosaic-info-icon", $.mosaic.document).live("click", function () {

            // Get tile config
            var tile_config = $(this).parents(".mosaic-tile").mosaicGetTileConfig();

            // Check if application tile
            if (tile_config.tile_type === 'app') {

                // Get url
                var tile_url = $(this).parents(".mosaic-tile").find('.tileUrl').html();
                if (tile_url.indexOf('?') != -1) {
                    var match = tile_url.split("?");
                    var start_url = match[0];
                    var parameters = match[1];
                    parameters = parameters.split("&");
                    for (var i = 0; i < parameters.length; i += 1) {
                        parameters[i] = '"' + parameters[i].replace('=', '":"') + '"';
                    }
                    tile_url = start_url + '?_tiledata={' + parameters.join(",") + '}';
                }
                tile_url = tile_url.replace(/@@/, '@@edit-tile/');

                // Open overlay
                $.mosaic.overlay.openIframe(tile_url);

            } else {

                // Edit field
                $.mosaic.overlay.open('field', tile_config);
            }
        });

        // Loop through matched elements
        var total = this.length;
        return this.each(function (i) {

            // Get current object
            var obj = $(this);

            // Add icons and dividers
            obj.find('.mosaic-tile').mosaicInitTile();
            obj.find('.mosaic-tile').mosaicAddDrag();
            obj.mosaicAddEmptyRows();
            obj.children('.mosaic-grid-row').mosaicSetResizeHandles();
            if (i === (total - 1)) {

                // Get biggest panel
                var width = 0;
                var index = 0;
                $.mosaic.options.panels.each(function (j) {
                    if ($(this).width() > width) {
                        width = $(this).width();
                        index = j;
                    }
                });

                // Select first tile in biggest panel
                $.mosaic.options.panels.eq(index).find('.mosaic-tile:first').mosaicSelectTile();
            }
        });
    };

    /**
     * Initialize the matched tiles
     *
     * @id jQuery.mosaicInitTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicInitTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get layout object
            var tile = $(this);
            var obj = tile.parents("[data-panel]");

            var tile_config = $(this).mosaicGetTileConfig();

            // Check read only
            if (tile_config && tile_config.read_only) {

                // Set read only
                $(this).addClass("mosaic-read-only-tile");
            }

            // Init rich text
            if (tile_config &&
                ((tile_config.tile_type === 'text' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'app' && tile_config.rich_text) ||
                 (tile_config.tile_type === 'field' && tile_config.read_only === false &&
                  (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
                   tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
                   tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
                   tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget')))) {

                // Init rich editor
                $(this).children('.mosaic-tile-content').mosaicEditor();
            }

            // Add border divs
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-tile-outer-border")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-inner-border")
                    )
            );

            // If tile is field tile
            if (tile_config && tile_config.tile_type === "field") {

                // Add label
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-field-label")
                        .append(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-field-label-content")
                                .html(tile_config.label)
                        )
                        .append(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-field-label-left")
                        )
                );
            }

            // If the tile is movable
            if ($(this).hasClass("movable") && $.mosaic.options.can_change_layout) {

                // Add drag handle
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-drag-handle")
                );
            }

            // If tile is removable
            if ($(this).hasClass("removable") && $.mosaic.options.can_change_layout) {

                // Add close icon
                $(this).prepend('<div class="mosaic-tile-control mosaic-close-icon"></div>');
            }

            // Add settings icon
            if (tile_config && tile_config.settings) {
                $(this).prepend(
                    $($.mosaic.document.createElement("div"))
                        .addClass("mosaic-tile-control mosaic-info-icon")
                );
            }

            // Add dividers
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-top")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-bottom")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-right")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
            $(this).prepend(
                $($.mosaic.document.createElement("div"))
                    .addClass("mosaic-divider mosaic-divider-left")
                    .append(
                        $($.mosaic.document.createElement("div"))
                            .addClass("mosaic-divider-dot")
                    )
            );
        });
    };

    /**
     * Select the matched tile
     *
     * @id jQuery.mosaicSelectTile
     * @return {Object} jQuery object
     */
    $.fn.mosaicSelectTile = function () {

        // Loop through matched elements
        return this.each(function () {

            // Check if not already selected
            if ($(this).hasClass("mosaic-selected-tile") === false) {

                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();
                $(this).addClass("mosaic-selected-tile");

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Focus the tile content field
                $(this).mosaicFocusTileContent();
            }
        });
    };

    /**
     * Focus the tile content
     *
     * @id jQuery.mosaicFocusTileContent
     * @return {Object} jQuery object
     */
    $.fn.mosaicFocusTileContent = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get content
            var tile_content = $(this).children(".mosaic-tile-content");
            tile_content.focus();

/*
            // Check if rich text
            if (tile_content.hasClass('mosaic-rich-text')) {

                // Append selection div to end of last block element
                tile_content.children(":last").append($($.mosaic.document.createElement("span"))
                    .addClass("mosaic-tile-selection-end")
                    .html("&nbsp;")
                );

                // Select node and delete the selection
                $.mosaic.document.selection.select(tile_content.find(".mosaic-tile-selection-end").get(0));
                $.mosaic.execCommand("Delete");

                // Fallback remove selection
                $(".mosaic-tile-selection-end", $.mosaic.document).remove();
            }
*/
        });
    };

    /**
     * Add mouse move handler to empty rows
     *
     * @id jQuery.mosaicAddMouseMoveEmptyRow
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddMouseMoveEmptyRow = function () {

        // Loop through matched elements
        return this.each(function () {

            // Mouse move event
            $(this).mousemove(function (e) {

                // Get layout object
                var obj = $(this).parents("[data-panel]");

                // Check if dragging
                if (obj.hasClass("mosaic-panel-dragging")) {

                    // Hide all dividers
                    $(".mosaic-selected-divider", $.mosaic.document)
                        .removeClass("mosaic-selected-divider");
                    $(this).children("div").addClass("mosaic-selected-divider");
                }
            });
        });
    };

    /**
     * Add empty rows
     *
     * @id jQuery.mosaicAddEmptyRows
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddEmptyRows = function () {

        // Loop through matched elements
        return this.each(function () {

            // Loop through rows
            $(this).find(".mosaic-grid-row").each(function (i) {

                // Check if current row has multiple columns
                if ($(this).children(".mosaic-grid-cell").length > 1) {

                    // Check if first row
                    if (i === 0) {
                        $(this).before(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }

                    // Check if last row or next row also contains columns
                    if (($(this).nextAll(".mosaic-grid-row").length === 0) || ($(this).next().children(".mosaic-grid-cell").length > 1)) {
                        $(this).after(
                            $($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row mosaic-empty-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($($.mosaic.document.createElement("div"))
                                        .append($($.mosaic.document.createElement("div"))
                                            .addClass("mosaic-tile-outer-border")
                                            .append(
                                                $($.mosaic.document.createElement("div"))
                                                    .addClass("mosaic-divider-dot")
                                            )
                                        )
                                    )
                                )
                                .mosaicAddMouseMoveEmptyRow()
                        );
                    }
                }
            });
        });
    };

    /**
     * Get the width class of the matched elements
     *
     * @id jQuery.mosaicGetWidthClass
     * @return {String} Name of the width class
     */
    $.fn.mosaicGetWidthClass = function () {

        var x;

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {

                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x])) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Loop through width classes
        for (x in $.mosaic.layout.widthClasses) {

            if ($.mosaic.layout.widthClasses.hasOwnProperty(x)) {
                // If class found
                if ($(this).hasClass($.mosaic.layout.widthClasses[x].replace("position", "resize"))) {

                    // Return the width class
                    return $.mosaic.layout.widthClasses[x];
                }
            }
        }

        // Fallback
        return $.mosaic.layout.widthClasses[0];
    };

    /**
     * Get the position class of the matched elements
     *
     * @id jQuery.mosaicGetPositionClass
     * @return {String} Name of the position class
     */
    $.fn.mosaicGetPositionClass = function () {

        var x;

        // Loop through position classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x])) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Loop through resize classes
        for (x in $.mosaic.layout.positionClasses) {

            // If class found
            if ($(this).hasClass($.mosaic.layout.positionClasses[x].replace("position", "resize"))) {

                // Return the position class
                return $.mosaic.layout.positionClasses[x];
            }
        }

        // Fallback
        return $.mosaic.layout.positionClasses[0];
    };

    /**
     * Add draggable to matched elements
     *
     * @id jQuery.mosaicAddDrag
     * @return {Object} jQuery object
     */
    $.fn.mosaicAddDrag = function () {

        // Loop through matched elements
        return this.each(function () {

            var tile = $(this);

            var DragMove = function (event) {
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                var offset = helper.parents("[data-panel]").offset();
                helper.css("top", event.pageY + 3 - offset.top);
                helper.css("left", event.pageX + 3 - offset.left);
            };
            var DragStop = function () {
                var helper = $('.mosaic-helper-tile', $.mosaic.document);
                $($.mosaic.document)
                    .unbind('mousemove', DragMove)
                    .unbind('mouseup', DragStop);

                // Handle drag end
                helper.mosaicHandleDragEnd();
                helper.remove();
            };
            return tile.each(function () {
                tile.find('div.mosaic-drag-handle')
                    .unbind('mousedown')
                    .bind('mousedown', function (event) {

                    var downX = event.pageX;
                    var downY = event.pageY;
                    var DragCheckMove = function (event) {
                        if (Math.max(
                            Math.abs(downX - event.pageX),
                            Math.abs(downY - event.pageY)
                        ) >= 1) {

                            // Add dragging class to content area
                            $.mosaic.options.panels.addClass("mosaic-panel-dragging");
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .removeClass("mosaic-selected-tile")
                                .children(".mosaic-tile-content").blur();

                            var originaltile = $(event.target).parents(".mosaic-tile");

                            var clone = originaltile.clone(true);
                            originaltile.addClass("mosaic-original-tile");

                            originaltile.parents("[data-panel]").append(clone);
                            clone
                                .css({
                                    "width": originaltile.width(),
                                    "position": "absolute",
                                    "opacity": 0.5
                                })
                                .addClass("mosaic-helper-tile");
                            $($.mosaic.document).mousemove(DragMove);
                            $($.mosaic.document).mouseup(DragStop);
                            $($.mosaic.document).unbind('mousemove', DragCheckMove);
                        }
                    };
                    $($.mosaic.document).bind('mousemove', DragCheckMove);
                    $($.mosaic.document).bind('mouseup', function () {
                        $($.mosaic.document).unbind('mousemove', DragCheckMove);
                    });
                });
            });
        });
    };

    /**
     * Event handler for drag end
     *
     * @id jQuery.mosaicHandleDragEnd
     * @return {Object} jQuery object
     */
    $.fn.mosaicHandleDragEnd = function () {

        // Get layout object
        var obj = $(this).parents("[data-panel]");

        // Remove dragging class from content
        $.mosaic.options.panels.removeClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Get direction
        var divider = $(".mosaic-selected-divider", $.mosaic.document);
        var drop = divider.parent();
        var dir = "";
        if (divider.hasClass("mosaic-divider-top")) {
            dir = "top";
        }
        if (divider.hasClass("mosaic-divider-bottom")) {
            dir = "bottom";
        }
        if (divider.hasClass("mosaic-divider-left")) {
            dir = "left";
        }
        if (divider.hasClass("mosaic-divider-right")) {
            dir = "right";
        }
        divider.removeClass("mosaic-selected-divider");

        // True if new tile is inserted
        var new_tile = $(".mosaic-helper-tile-new", $.mosaic.document).length > 0;
        var original_tile = $(".mosaic-original-tile", $.mosaic.document);

        // Check if esc is pressed
        if (original_tile.hasClass("mosaic-drag-cancel")) {

            // Remove cancel class
            original_tile.removeClass("mosaic-drag-cancel");

            // Remove remaining empty rows
            $.mosaic.options.panels.find(".mosaic-empty-row").remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Dropped on empty row
        } else if (drop.hasClass("mosaic-empty-row")) {

            // Replace empty with normal row class
            drop
                .removeClass("mosaic-empty-row")
                .unbind('mousemove');

            // Clean cell
            drop.children(".mosaic-grid-cell")
                .children("div").remove();

            // Add tile to empty row
            drop.children(".mosaic-grid-cell")
                .append(original_tile
                    .clone(true)
                    .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                    .css({width: "", left: "", top: ""})
                    .mosaicAddDrag()
                    .addClass("mosaic-new-tile")
            );

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

        // Not dropped on tile
        } else if (drop.hasClass("mosaic-tile") === false) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

        // Check if max columns rows is reached
        } else if ((drop.parent().parent().children(".mosaic-grid-cell").length === 4) && (dir === "left" || dir === "right")) {

            // Remove remaining empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // Check if new tile
            if (!new_tile) {

                // Make sure the original tile doesn't get removed
                original_tile
                    .removeClass("mosaic-original-tile")
                    .addClass("mosaic-new-tile");
            }

            // Notify user
            $.plone.notify({
                title: "Info",
                message: "You can't have more then 4 columns",
                sticky: false
            });

        // Dropped on row
        } else {

            // Remove empty rows
            $(".mosaic-empty-row", $.mosaic.document).remove();

            // If top
            if (dir === "top") {

                // Add tile before
                drop.before(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If bottom
            } else if (dir === "bottom") {

                // Add tile after
                drop.after(
                    original_tile
                        .clone(true)
                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                        .css({width: "", left: "", top: ""})
                        .mosaicAddDrag()
                        .addClass("mosaic-new-tile")
                );

            // If left
            } else if ((dir === "left") || (dir === "right")) {

                // Check if only 1 column in the row
                if (drop.parent().parent().children(".mosaic-grid-cell").length === 1) {

                    // Put tiles above dropped tile in a new row above
                    var prev_elms = drop.prevAll();
                    if (prev_elms.length > 0) {
                        drop.parent().parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append($(prev_elms.get().reverse()).clone(true).mosaicAddDrag())
                                )
                            );
                        prev_elms.remove();
                    }

                    // Put tiles below dropped tile in a new row below
                    var next_elms = drop.nextAll();
                    if (next_elms.length > 0) {
                        drop.parent().parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-row")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-grid-cell mosaic-width-full mosaic-position-leftmost")
                                    .append(next_elms.clone(true).mosaicAddDrag())
                                )
                            );
                        next_elms.remove();
                    }

                    // Resize current column
                    drop.parent()
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "))
                        .addClass("mosaic-width-half");

                    // Create column with dragged tile in it
                    if (dir === "left") {
                        drop.parent()
                            .addClass("mosaic-position-half")
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    } else {
                        drop.parent()
                            .addClass("mosaic-position-leftmost")
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-half")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                )
                        );
                    }

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();

                // Dropped inside column
                } else {

                    // Create new column
                    if (dir === "left") {
                        drop.parent()
                            .before($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    } else {
                        drop.parent()
                            .after($($.mosaic.document.createElement("div"))
                                .addClass("mosaic-grid-cell")
                                .append(
                                    original_tile
                                        .clone(true)
                                        .removeClass("mosaic-original-tile mosaic-helper-tile mosaic-helper-tile-new mosaic-tile-align-right mosaic-tile-align-left")
                                        .css({width: "", left: "", top: ""})
                                        .mosaicAddDrag()
                                        .addClass("mosaic-new-tile")
                                    )
                            );
                    }

                    // Rezize columns
                    drop.parent().parent().mosaicSetColumnSizes();

                    // Add resize handles
                    drop.parent().parent().mosaicSetResizeHandles();
                }
            }
        }

        // Remove original tile
        var original_row = original_tile.parent().parent();
        $(".mosaic-original-tile", $.mosaic.document).remove();

        // Cleanup original row
        original_row.mosaicCleanupRow();

        // Add empty rows
        $.mosaic.options.panels.mosaicAddEmptyRows();

        // Select new tile
        if (new_tile) {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile").mosaicSelectTile();
        } else {
            $(".mosaic-new-tile", $.mosaic.document).removeClass("mosaic-new-tile");
        }
    };

    /**
     * Set the sizes of the column
     *
     * @id jQuery.mosaicSetColumnSizes
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetColumnSizes = function () {

        // Loop through matched elements
        return this.each(function () {

            // Resize columns in the row
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            $(this)
                .children(".mosaic-grid-cell").each(function (i) {
                    $(this)
                        .removeClass($.mosaic.layout.widthClasses.join(" "))
                        .removeClass($.mosaic.layout.positionClasses.join(" "));

                    // Set width / position
                    switch (nr_of_columns) {

                    // 1 column
                    case 1:
                        $(this).addClass("mosaic-width-full mosaic-position-leftmost");
                        break;

                    // 2 columns
                    case 2:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-half mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-half mosaic-position-half");
                            break;
                        }
                        break;

                    // 3 columns
                    case 3:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-third mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-third mosaic-position-third");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-third mosaic-position-two-thirds");
                            break;
                        }
                        break;

                    // 4 columns
                    case 4:
                        switch (i) {
                        case 0:
                            $(this).addClass("mosaic-width-quarter mosaic-position-leftmost");
                            break;
                        case 1:
                            $(this).addClass("mosaic-width-quarter mosaic-position-quarter");
                            break;
                        case 2:
                            $(this).addClass("mosaic-width-quarter mosaic-position-half");
                            break;
                        case 3:
                            $(this).addClass("mosaic-width-quarter mosaic-position-three-quarters");
                            break;
                        }
                        break;
                    }
                });
        });
    };

    /**
     * Add new resize handlers
     *
     * @id jQuery.mosaicSetResizeHandles
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetResizeHandles = function () {

        // Loop through matched elements
        return this.each(function () {

            // Remove resize handles
            $(this).children(".mosaic-resize-handle").remove();

            // Check number of columns
            var nr_of_columns = $(this).children(".mosaic-grid-cell").length;
            switch (nr_of_columns) {
            case 2:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            case 3:
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-one " + $($(this).children(".mosaic-grid-cell").get(1))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                $(this).append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-center mosaic-resize-handle-two " + $($(this).children(".mosaic-grid-cell").get(2))
                        .mosaicGetPositionClass().replace("position", "resize")
                    )
                );
                break;
            }

            // Mouse down handler on resize handle
            $(this).children(".mosaic-resize-handle").mousedown(function (e) {

                // Get number of columns and current sizes
                var column_sizes = new Array();
                $(this).parent().children(".mosaic-grid-cell").each(function () {

                    // Add column size
                    switch ($(this).mosaicGetWidthClass()) {
                    case "mosaic-width-half":
                        column_sizes.push("50");
                        break;
                    case "mosaic-width-quarter":
                        column_sizes.push("25");
                        break;
                    case "mosaic-width-third":
                        column_sizes.push("33");
                        break;
                    case "mosaic-width-two-thirds":
                        column_sizes.push("66");
                        break;
                    case "mosaic-width-three-quarters":
                        column_sizes.push("75");
                        break;
                    }

                    // Add placeholder
                    $(this).parent().append($($.mosaic.document.createElement("div"))
                        .addClass("mosaic-resize-placeholder " + $(this).mosaicGetWidthClass() + " " + $(this).mosaicGetPositionClass().replace("position", "resize"))
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-resize-placeholder-inner-border")
                        )
                    );
                });

                // Get resize handle index
                var resize_handle_index = 1;
                if ($(this).hasClass("mosaic-resize-handle-two")) {
                    resize_handle_index = 2;
                }

                // Add helper
                $(this).parent().append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-resize-handle mosaic-resize-handle-helper")
                    .addClass($(this).mosaicGetPositionClass().replace("position", "resize"))
                    .data("row_width", $(this).parent().width())
                    .data("nr_of_columns", $(this).parent().children(".mosaic-grid-cell").length)
                    .data("column_sizes", column_sizes.join(" "))
                    .data("resize_handle_index", resize_handle_index)
                );

                // Set resizing state
                $(this).parents("[data-panel]").addClass("mosaic-panel-resizing");
                $(this).parent().addClass("mosaic-row-resizing");
                $(".mosaic-selected-tile", $.mosaic.document).children(".mosaic-tile-content").blur();

                // Prevent drag event
                return false;
            });
        });
    };

    /**
     * Cleanup row after tiles added or removed from the row
     *
     * @id jQuery.mosaicCleanupRow
     * @return {Object} jQuery object
     */
    $.fn.mosaicCleanupRow = function () {

        // Loop through matched elements
        return this.each(function () {

            // Get original row
            var original_row = $(this);

            // Remove empty columns
            original_row.children(".mosaic-grid-cell").each(function () {
                if ($(this).children().length === 0) {
                    $(this).remove();

                    // Resize columns
                    original_row.mosaicSetColumnSizes();
                }
            });

            // Remove row if no tiles inside
            if (original_row.find(".mosaic-tile").length === 0) {
                var del_row = original_row;

                // Check if next row available
                if (original_row.nextAll(".mosaic-grid-row").length > 0) {
                    original_row = original_row.next(".mosaic-grid-row");

                // Check if prev row available
                } else if (original_row.prevAll(".mosaic-grid-row").length > 0) {
                    original_row = original_row.prev(".mosaic-grid-row");

                // This is the last row
                } else {
                    original_row.remove();
                    return;
                }

                // Remove current row
                del_row.remove();
            }

            // Check if prev row exists and if both rows only have 1 column
            if ((original_row.prevAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) && (original_row.prev().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").prepend(
                    original_row.prev().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.prev().remove();
            }

            // Check if next row exists and if both rows only have 1 column
            if ((original_row.nextAll(".mosaic-grid-row").length > 0) && (original_row.children(".mosaic-grid-cell").length === 1) && (original_row.next().children(".mosaic-grid-cell").length === 1)) {

                // Merge rows
                original_row.children(".mosaic-grid-cell").append(
                    original_row.next().children(".mosaic-grid-cell").children(".mosaic-tile")
                        .clone(true)
                        .mosaicAddDrag()
                );
                original_row.next().remove();
            }

            // Set resize handles
            original_row.mosaicSetResizeHandles();
        });
    };

    /**
     * Set the location of the resize handle (left, right or center)
     *
     * @id jQuery.mosaicSetResizeHandleLocation
     * @return {Object} jQuery object
     */
    $.fn.mosaicSetResizeHandleLocation = function () {

        // Get panel
        var obj = $(this);

        // Loop through rows
        obj.children(".mosaic-grid-row").each(function () {

            // Get row
            var row = $(this);

            // Get cells
            var cells = row.children(".mosaic-grid-cell");

            // Check if 2 or 3 columns
            if ((cells.length === 2) || (cells.length === 3)) {

                // Remove location classes
                row.children(".mosaic-resize-handle").removeClass("mosaic-resize-handle-left mosaic-resize-handle-center mosaic-resize-handle-right");

                // Check if first column is selected
                if ($(cells.get(0)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-left");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");

                // Check if second columns is selected
                } else if ($(cells.get(1)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-right");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-left");

                // Check if third column is selected
                } else if (cells.length === 3 && $(cells.get(2)).children(".mosaic-tile").hasClass("mosaic-selected-tile")) {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-right");

                // No tile selected
                } else {

                    // Set location
                    row.children(".mosaic-resize-handle-one").addClass("mosaic-resize-handle-center");
                    row.children(".mosaic-resize-handle-two").addClass("mosaic-resize-handle-center");
                }
            }
        });
    };

    /**
     * Get the config of the tile
     *
     * @id jQuery.mosaicGetTileConfig
     * @return {Object} config of the tile
     */
    $.fn.mosaicGetTileConfig = function () {

        // Get tile type
        var tiletype = '';
        var classes = $(this).attr('class').split(" ");
        $(classes).each(function () {
            var classname = this.match(/^mosaic-(.*)-tile$/);
            if (classname !== null) {
                if ((classname[1] !== 'selected') && (classname[1] !== 'new') && (classname[1] !== 'read-only') && (classname[1] !== 'helper') && (classname[1] !== 'original')) {
                    tiletype = classname[1];
                }
            }
        });

        // Get tile config
        var tile_config;
        for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
            var tile_group = $.mosaic.options.tiles[x];
            for (var y = 0; y < tile_group.tiles.length; y += 1) {
                if (tile_group.tiles[y].name === tiletype) {
                    tile_config = tile_group.tiles[y];
                }
            }
        }

        // Return config
        return tile_config;
    };

    /**
     * Get the direction based on the tile size and relative x and y coords of the cursor
     *
     * @id jQuery.mosaicGetDirection
     * @param {Object} e Event object
     * @return {String} Direction of the cursor relative to the tile
     */
    $.fn.mosaicGetDirection = function (e) {

        // Calculate x, y, width and height
        var width = parseFloat($(this).width());
        var height = parseFloat($(this).height());
        var x = parseFloat((e.pageX - $(this).offset().left) - (width / 2));
        var y = parseFloat((e.pageY - $(this).offset().top) - (height / 2));
        var halfwidth = width / 2;
        var halfheight = height / 2;

        // If left of center
        if (x < 0) {

            // If above center
            if (y < 0) {
                if ((x / y) < ((-1 * halfwidth) / (-1 * halfheight))) {
                    return "top";
                } else {
                    return "left";
                }
            // Below center
            } else {
                if ((x / y) < ((-1 * halfwidth) / (halfheight))) {
                    return "left";
                } else {
                    return "bottom";
                }
            }

        // Right of center
        } else {

            // If above center
            if (y < 0) {
                if ((x / y) < ((1 * halfwidth) / (-1 * halfheight))) {
                    return "right";
                } else {
                    return "top";
                }
            // Below center
            } else {
                if ((x / y) < ((halfwidth) / (halfheight))) {
                    return "bottom";
                } else {
                    return "right";
                }
            }
        }
    };

    /**
     * Disable edit html source
     *
     * @id jQuery.mosaic.disableEditHtmlSource
     */
    $.mosaic.disableEditHtmlSource = function () {

        // Find rich text textareas
        $(".mosaic-rich-text-textarea", $.mosaic.document).each(function () {

            // Local variables
            var tilecontent, text;

            // Get text and tilecontent
            text = $(this).val();
            tilecontent = $(this).parent();
            tilecontent
                .html(text)
                .mosaicEditor();
        });
    };


    /**
     * Add an apptile with the given value
     *
     * @id jQuery.mosaic.addAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.addAppTile = function (type, url, id) {

        // Close overlay
        $.mosaic.overlay.close();

        // Get value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Add tile
                $.mosaic.addTile(type,
                    '<p class="hiddenStructure tileUrl">' + url + '</p>' +
                        value.find('.temp_body_tag').html());
            }
        });
    };

    /**
     * Edit an apptile with the given value
     *
     * @id jQuery.mosaic.editAppTile
     * @param {String} type Type of the application tile
     * @param {String} url Url of the application tile
     * @param {String} id Id of the application tile
     */
    $.mosaic.editAppTile = function (url) {

        // Close overlay
        $.mosaic.overlay.close();

        // Focus on current window
        window.parent.focus();

        // Get new value
        $.ajax({
            type: "GET",
            url: url,
            success: function (value) {

                // Get dom tree
                value = $.mosaic.getDomTreeFromHtml(value);

                // Remove head tags
                $.mosaic.removeHeadTags(url);

                // Add head tags
                $.mosaic.addHeadTags(url, value);

                // Update tile
                $('.mosaic-selected-tile .mosaic-tile-content',
                  $.mosaic.document).html('<p class="hiddenStructure tileUrl">' + url + '</p>' + value.find('.temp_body_tag').html());
            }
        });
    };

    /**
     * Add a tile with the given value
     *
     * @id jQuery.mosaic.addTile
     * @param {String} type Type of the application tile
     * @param {String} value Value of the application tile
     */
    $.mosaic.addTile = function (type, value) {

        // Set dragging state
        $.mosaic.options.panels.addClass("mosaic-panel-dragging mosaic-panel-dragging-new");

        // Add helper
        $($.mosaic.options.panels.get(0)).append(
            $($.mosaic.document.createElement("div"))
                .addClass("mosaic-grid-row")
                .append($($.mosaic.document.createElement("div"))
                    .addClass("mosaic-grid-cell mosaic-width-half mosaic-position-leftmost")
                    .append($($.mosaic.document.createElement("div"))
                        .addClass("movable removable mosaic-tile mosaic-" + type + "-tile")
                        .append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-content")
                            .html(value)
                        )
                        .addClass("mosaic-helper-tile mosaic-helper-tile-new mosaic-original-tile")
                    )
                )
        );

        // Set helper min size
        var helper = $.mosaic.options.panels.find(".mosaic-helper-tile-new");

        // Get max width
        var width = 0;
        $.mosaic.options.panels.each(function () {
            if ($(this).width() > width) {
                width = $(this).width();
            }
        });

        // Set width
        if (helper.width() < (width / 4)) {
            helper.width(width / 4);
        } else {
            helper.width(helper.width());
        }
        helper.mosaicInitTile();

        // Notify user
        /*
        $.plone.notify({
            title: "Inserting new tile",
            message: "Select the location for the new tile",
            sticky: false
        });
        */
    };

    /**
     * Get the default value of the given tile
     *
     * @id jQuery.mosaic.getDefaultValue
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.getDefaultValue = function (tile_config) {
        switch (tile_config.tile_type) {
        case "field":
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                return '<div>' + $("#" + tile_config.id, $.mosaic.document).find('input').attr('value') + '</div>';
                break;
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
                var lines = $("#" + tile_config.id, $.mosaic.document).find('textarea').attr('value').split('\n');
                var return_string = "";
                for (var i = 0; i < lines.length; i += 1) {
                    return_string += '<div>' + lines[i] + '</div>';
                }
                return return_string;
                break;
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                return $("#" + tile_config.id, $.mosaic.document).find('textarea').attr('value');
                break;
            default:
                return '<div class="discreet">Placeholder for field:<br/><b>' + tile_config.label + '</b></div>';
                break;
            }
            break;
        default:
            return tile_config.default_value;
            break;
        }
    };

    /**
     * Save the tile value to the form
     *
     * @id jQuery.mosaic.saveTileValueToForm
     * @param {String} tiletype Type of the tile
     * @param {Object} tile_config Configuration options of the tile
     * @return {String} Default value of the given tile
     */
    $.mosaic.saveTileValueToForm = function (tiletype, tile_config) {

        // Update field values if type is rich text
        if (tile_config && tile_config.tile_type === 'field' &&
            tile_config.read_only === false &&
            (tile_config.widget === 'z3c.form.browser.text.TextWidget' ||
             tile_config.widget === 'z3c.form.browser.text.TextFieldWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaWidget' ||
             tile_config.widget === 'z3c.form.browser.textarea.TextAreaFieldWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygWidget' ||
             tile_config.widget === 'plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget')) {
            switch (tile_config.widget) {
            case "z3c.form.browser.text.TextWidget":
            case "z3c.form.browser.text.TextFieldWidget":
                $("#" + tile_config.id).find('input').attr('value', $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').html());
                break;
            case "z3c.form.browser.textarea.TextAreaWidget":
            case "z3c.form.browser.textarea.TextAreaFieldWidget":
                var value = "";
                $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content > *').each(function () {
                    value += $(this).html() + "\n";
                });
                value = value.replace(/<br[^>]*>/ig, "\n");
                $("#" + tile_config.id).find('textarea').attr('value', value);
                break;
            case "plone.app.z3cform.wysiwyg.widget.WysiwygWidget":
            case "plone.app.z3cform.wysiwyg.widget.WysiwygFieldWidget":
                $(document.getElementById(tile_config.id)).find('textarea').attr('value', $('.mosaic-' + tiletype + '-tile', $.mosaic.document).find('.mosaic-tile-content').html());
                break;
            }
        }
    };

    /**
     * Get the content of the page which can be saved
     *
     * @id jQuery.mosaic.getPageContent
     * @return {String} Full content of the page
     */
    $.mosaic.getPageContent = function () {

        // Content
        var content,
            body = "",
            tilecount = 0,
            panel_id = "";

        // Disable edit html source
        $.mosaic.disableEditHtmlSource();

        // Add body tag
        body += "  <body>\n";

        // Loop through panels
        $("[data-panel]", $.mosaic.document).each(function () {

            // Add open panel tag
            panel_id = $(this).attr("data-panel");
            body += '    <div data-panel="' + panel_id + '">\n';

            // Loop through rows
            $(this).children(".mosaic-grid-row").each(function () {

                // Check if not an empty row
                if ($(this).hasClass("mosaic-empty-row") === false) {

                    // Add row open tag
                    body += '      <div class="mosaic-grid-row">\n';

                    // Loop through rows
                    $(this).children(".mosaic-grid-cell").each(function () {

                        // Add cell start tag
                        body += '        <div class="' +
                            $(this).attr("class") + '">\n';

                        // Loop through tiles
                        $(this).children(".mosaic-tile").each(function () {

                            // Get tile type
                            var tiletype = '',
                                classes = $(this).attr('class').split(" ");
                            $(classes).each(function () {
                                var classname = this.match(/^mosaic-(.*)-tile$/);
                                if (classname !== null) {
                                    if ((classname[1] !== 'selected') && (classname[1] !== 'new') && (classname[1] !== 'read-only') && (classname[1] !== 'helper') && (classname[1] !== 'original')) {
                                        tiletype = classname[1];
                                    }
                                }
                            });

                            // Get tile config
                            var tile_config;
                            for (var x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                                var tile_group = $.mosaic.options.tiles[x];
                                for (var y = 0; y < tile_group.tiles.length; y += 1) {
                                    if (tile_group.tiles[y].name === tiletype) {
                                        tile_config = tile_group.tiles[y];
                                    }
                                }
                            }

                            // Predefine vars
                            var tile_url;

                            switch (tile_config.tile_type) {
                            case "text":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';
                                body += $(this).children(".mosaic-tile-content").html();
                                body += '          </div>\n';
                                body += '          </div>\n';
                                break;
                            case "app":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Get url
                                tile_url = $(this).find('.tileUrl').html();
                                if (tile_url === null) {
                                    break;
                                }
                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';

                                // Save title and description
                                if (tile_config.name === 'plone.app.standardtiles.title') {
                                    $('.mosaic-plone\\.app\\.standardtiles\\.title-tile .mosaic-tile-content .hiddenStructure', $.mosaic.document).remove();
                                    $("#formfield-form-widgets-IDublinCore-title").find('input').attr('value', $.trim($('.mosaic-plone\\.app\\.standardtiles\\.title-tile .mosaic-tile-content', $.mosaic.document).text()));
                                }
                                if (tile_config.name === 'plone.app.standardtiles.description') {
                                    $('.mosaic-plone\\.app\\.standardtiles\\.description-tile .mosaic-tile-content .hiddenStructure', $.mosaic.document).remove();
                                    $("#formfield-form-widgets-IDublinCore-description").find('textarea').attr('value', $.trim($('.mosaic-plone\\.app\\.standardtiles\\.description-tile .mosaic-tile-content', $.mosaic.document).text()));
                                }

                                break;
                            case "field":
                                body += '          <div class="' + $(this).attr("class") + '">\n';
                                body += '          <div class="mosaic-tile-content">\n';

                                // Calc url
                                tile_url = './@@plone.app.standardtiles.field?field=' + tiletype;

                                body += '          <div data-tile="' + tile_url + '"></div>\n';
                                body += '          </div>\n';
                                body += '          </div>\n';

                                // Update field values if type is rich text
                                $.mosaic.saveTileValueToForm(tiletype, tile_config);
                                break;
                            }
                        });

                        // Add cell end tag
                        body += '        </div>\n';
                    });

                    // Add row close tag
                    body += '      </div>\n';
                }
            });

            // Add close panel tag
            body += '    </div>\n';
        });

        // Add close tag
        body += "  </body>\n";

        content = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en" data-layout="' + $.mosaic.options.layout + '">\n';
        content += body;
        content += '</html>\n';
        return content;
    };

    /**
     * Get the name of the width class of the given integer
     *
     * @id GetWidthClassByInt
     * @param {Integer} column_width Percentage of the column width
     * @return {String} Classname of the width class of the given integer
     */
    function GetWidthClassByInt(column_width) {
        switch (column_width) {
        case 25:
            return "mosaic-width-quarter";
        case 33:
            return "mosaic-width-third";
        case 50:
            return "mosaic-width-half";
        case 66:
        case 67:
            return "mosaic-width-two-thirds";
        case 75:
            return "mosaic-width-three-quarters";
        case 100:
            return "mosaic-width-full";
        }

        // Fallback
        return "mosaic-width-full";
    }

    /**
     * Get the name of the position class of the given integer
     *
     * @id GetPositionClassByInt
     * @param {Integer} position Percentage of the column position
     * @return {String} Classname of the position class of the given integer
     */
    function GetPositionClassByInt(position) {
        switch (position) {
        case 0:
            return "mosaic-position-leftmost";
        case 25:
            return "mosaic-position-quarter";
        case 33:
            return "mosaic-position-third";
        case 50:
            return "mosaic-position-half";
        case 66:
        case 67:
            return "mosaic-position-two-thirds";
        case 75:
            return "mosaic-position-three-quarters";
        }

        // Fallback
        return "mosaic-position-leftmost";
    }

}(jQuery));

define("mosaic.layout", function(){});

/**
 * This plugin is used to create a mosaic toolbar.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    /**
     * Adds a control to the toolbar
     *
     * @id AddControl
     * @param {Object} parent Parent object to append control to
     * @param {Object} action Object of the action
     */
    function AddControl(parent, action) {

        // Check if button or menu
        if ((typeof (action.menu) !== undefined) && (action.menu)) {

            // Check if icon menu
            if (action.icon) {

                // Create menu
                parent.append($(document.createElement("label"))
                    .addClass("mosaic-icon-menu mosaic-icon-menu-" +
                              action.name.replace(/_/g, "-") + ' mosaic-icon')
                    .html(action.label)
                    .attr("title", action.label)
                    .append($(document.createElement("select"))
                        .addClass("mosaic-menu-" + action.name.replace(/_/g, "-"))
                        .data("action", action.action)
                        .change(function () {
                            $(this).mosaicExecAction();
                        })
                        .each(function () {

                            // Local variables
                            var z, elm, y;

                            for (z in action.items) {

                                // Check if child objects
                                if (action.items[z].items !== undefined) {
                                    $(this).append($(document.createElement("optgroup"))
                                        .addClass("mosaic-option-group mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"))
                                        .attr("label", action.items[z].label)
                                    );
                                    elm = $(this).find(".mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"));

                                    // Add child nodes
                                    for (y in action.items[z].items) {
                                        elm.append(
                                            $(document.createElement("option"))
                                                .attr('value', action.items[z].items[y].value)
                                                .addClass('mosaic-option mosaic-option-' + action.items[z].items[y].value.replace(/\//g, "-"))
                                                .html(action.items[z].items[y].label)
                                        );
                                    }

                                // Else no child objects
                                } else {
                                    $(this).append(
                                        $(document.createElement("option"))
                                            .attr('value', action.items[z].value)
                                            .addClass('mosaic-option mosaic-option-' + action.items[z].value.replace(/\//g, "-"))
                                            .html(action.items[z].label)
                                    );
                                }
                            }
                        })
                    )
                );

            // Else text menu
            } else {

                // Create menu
                parent.append($(document.createElement("select"))
                    .addClass("mosaic-menu mosaic-menu-" + action.name.replace(/_/g, "-"))
                    .data("action", action.action)
                    .change(function () {
                        $(this).mosaicExecAction();
                    })
                    .each(function () {

                        // Local variables
                        var z, elm, y;
                        for (z = 0; z < action.items.length; z += 1) {

                            // Check if child objects
                            if (action.items[z].items !== undefined) {
                                $(this).append($(document.createElement("optgroup"))
                                    .addClass("mosaic-option-group mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"))
                                    .attr("label", action.items[z].label)
                                );
                                elm = $(this).find(".mosaic-option-group-" + action.items[z].value.replace(/_/g, "-").replace(/\//g, "-"));

                                // Add child nodes
                                for (y in action.items[z].items) {
                                    elm.append(
                                        $(document.createElement("option"))
                                            .attr('value', action.items[z].items[y].value)
                                            .addClass('mosaic-option mosaic-option-' + action.items[z].items[y].value.replace(/\//g, "-"))
                                            .html(action.items[z].items[y].label)
                                    );
                                }

                            // Else no child objects
                            } else {
                                $(this).append(
                                    $(document.createElement("option"))
                                        .attr('value', action.items[z].value)
                                        .addClass('mosaic-option mosaic-option-' + action.items[z].value.replace(/\//g, "-"))
                                        .html(action.items[z].label)
                                );
                            }
                        }
                    })
                );
            }

        } else {
            // Create button
            parent.append($(document.createElement("button"))
                .addClass("mosaic-button mosaic-button-" + action.name.replace(/_/g, "-") + (action.icon ? ' mosaic-icon' : ''))
                .html(action.label)
                .attr("title", action.label)
                .attr("type", "button")
                .data("action", action.action)
                .mousedown(function () {
                    $(this).mosaicExecAction();
                })
            );
        }
    }

    /**
     * Create a new instance of a mosaic toolbar.
     *
     * @constructor
     * @id jQuery.fn.mosaicToolbar
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicToolbar = function () {

        // Loop through matched elements
        return this.each(function () {

            // Local variables
            var obj, content, actions, a, x, action_group, elm_action_group, y,
            elm_select_insert, tile, elm_select_format, action,
            RepositionToolbar, SelectedTileChange;

            // Get current object
            obj = $(this);

            // Empty object
            obj.html("");

            // Add mosaic toolbar class
            obj.append($(document.createElement("div"))
                .addClass("mosaic-inline-toolbar")
            );
            obj = obj.children(".mosaic-inline-toolbar");

            // Add content
            obj.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-content")
            );
            content = obj.children(".mosaic-toolbar-content");

            // Add primary and secondary function div's
            actions = {};
            content.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-primary-functions")
            );
            actions.primary_actions =
                content.children(".mosaic-toolbar-primary-functions");
            content.append($(document.createElement("div"))
                .addClass("mosaic-toolbar-secondary-functions")
            );
            actions.secondary_actions =
                content.children(".mosaic-toolbar-secondary-functions");

            // Loop through action groups
            for (a in actions) {

                // Add actions to toolbar
                for (x = 0; x < $.mosaic.options[a].length; x += 1) {

                    // If single action
                    if ($.mosaic.options[a][x].actions === undefined) {

                        // Add control
                        AddControl(actions[a], $.mosaic.options[a][x]);

                    // If fieldset
                    } else {
                        action_group = $.mosaic.options[a][x];
                        actions[a].append($(document.createElement("fieldset"))
                            .addClass("mosaic-button-group mosaic-button-group-" +
                                $.mosaic.options[a][x].name.replace(/_/g, "-"))
                        );
                        elm_action_group = actions[a]
                            .children(".mosaic-button-group-" +
                            $.mosaic.options[a][x].name.replace(/_/g, "-"));
                        for (y = 0; y < action_group.actions.length; y += 1) {

                            // Add control
                            AddControl(elm_action_group,
                                       action_group.actions[y]);
                        }
                    }
                }
            }

            // Add formats to toolbar
            if ($.mosaic.options.formats !== undefined) {
                for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
                    action_group = $.mosaic.options.formats[x];
                    actions.primary_actions.append($(document.createElement("fieldset"))
                        .addClass("mosaic-button-group mosaic-button-group-" + action_group.name.replace(/_/g, "-"))
                    );
                    elm_action_group = actions.primary_actions.children(".mosaic-button-group-" + action_group.name.replace(/_/g, "-"));
                    for (y = 0; y < action_group.actions.length; y += 1) {
                        if (action_group.actions[y].favorite) {

                            // Add control
                            AddControl(elm_action_group, action_group.actions[y]);
                        }
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Add items to the insert menu
            if ($.mosaic.options.tiles !== undefined) {
                elm_select_insert = actions.secondary_actions.find(".mosaic-menu-insert");
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    action_group = $.mosaic.options.tiles[x];
                    elm_select_insert.append($(document.createElement("optgroup"))
                        .addClass("mosaic-option-group mosaic-option-group-" + action_group.name.replace(/_/g, "-"))
                        .attr("label", action_group.label)
                    );
                    elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + action_group.name.replace(/_/g, "-"));
                    for (y = 0; y < action_group.tiles.length; y += 1) {
                        tile = action_group.tiles[y];
                        elm_action_group.append($(document.createElement("option"))
                            .addClass("mosaic-option mosaic-option-" + tile.name.replace(/_/g, "-"))
                            .attr("value", tile.name)
                            .html(tile.label)
                        );
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Add items to the format menu
            if ($.mosaic.options.formats !== undefined) {
                elm_select_format = actions.secondary_actions.find(".mosaic-menu-format");
                for (x = 0; x < $.mosaic.options.formats.length; x += 1) {
                    action_group = $.mosaic.options.formats[x];
                    elm_select_format.append($(document.createElement("optgroup"))
                        .addClass("mosaic-option-group mosaic-option-group-" + action_group.name.replace(/_/g, "-"))
                        .attr("label", action_group.label)
                    );
                    elm_action_group = actions.secondary_actions.find(".mosaic-option-group-" + action_group.name.replace(/_/g, "-"));
                    for (y = 0; y <  action_group.actions.length; y += 1) {
                        action = action_group.actions[y];
                        if (action.favorite === false) {
                            elm_action_group.append($(document.createElement("option"))
                                .addClass("mosaic-option mosaic-option-" + action.name.replace(/_/g, "-"))
                                .attr("value", action.name)
                                .html(action.label)
                                .data("action", action.action)
                            );
                        }
                    }
                    if (elm_action_group.children().length === 0) {
                        elm_action_group.remove();
                    }
                }
            }

            // Reposition toolbar on scroll
            RepositionToolbar = function () {

                // Local variables
                var left;

                if (parseInt($(window).scrollTop(), 10) >
                    parseInt(obj.parent().offset().top, 10)) {
                    if (obj.hasClass("mosaic-inline-toolbar")) {
                        left = obj.offset().left;

                        obj
                            .width(obj.width())
                            .css({
                                'left': left,
                                'margin-left': '0px'
                            })
                            .removeClass("mosaic-inline-toolbar")
                            .addClass("mosaic-external-toolbar")
                            .parent().height(obj.height());
                    }
                } else {
                    if (obj.hasClass("mosaic-external-toolbar")) {
                        obj
                            .css({
                                'width': '',
                                'left': '',
                                'margin-left': ''
                            })
                            .removeClass("mosaic-external-toolbar")
                            .addClass("mosaic-inline-toolbar")
                            .parent().css('height', '');
                    }
                }
            };

            // Bind method and add to array
            $(window).bind('scroll', RepositionToolbar);

            // Bind selected tile change event
            SelectedTileChange = function () {

                // Local variables
                var obj, tiletype, selected_tile, classes, actions, x,
                tile_group, y;

                // Disable edit html source
                $.mosaic.disableEditHtmlSource();

                // Get object
                obj = $(this);

                // Get selected tile and tiletype
                tiletype = "";
                selected_tile = $(".mosaic-selected-tile", $.mosaic.document);
                if (selected_tile.length > 0) {
                    classes = selected_tile.attr('class').split(" ");
                    $(classes).each(function () {
                        var classname = this.match(/^mosaic-(.*)-tile$/);
                        if (classname !== null) {
                            if ((classname[1] !== 'selected') &&
                                (classname[1] !== 'new') &&
                                (classname[1] !== 'read-only') &&
                                (classname[1] !== 'helper') &&
                                (classname[1] !== 'original')) {
                                tiletype = classname[1];
                            }
                        }
                    });
                }

                // Get actions
                actions = $.mosaic.options.default_available_actions;
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    tile_group = $.mosaic.options.tiles[x];
                    for (y = 0; y <  tile_group.tiles.length; y += 1) {
                        if (tile_group.tiles[y].name === tiletype) {
                            actions = actions
                                .concat(tile_group.tiles[y].available_actions);
                        }
                    }
                }

                // Show option groups
                obj.find(".mosaic-option-group").show();

                // Hide all actions
                obj.find(".mosaic-button").hide();
                obj.find(".mosaic-menu").hide();
                obj.find(".mosaic-icon-menu").hide();
                obj.find(".mosaic-menu-format").find(".mosaic-option")
                    .hide()
                    .attr("disabled", "disabled");
                $(obj.find(".mosaic-menu-format").find(".mosaic-option").get(0))
                    .show()
                    .attr("disabled", "");

                // Show actions
                $(actions).each(function () {
                    obj.find(".mosaic-button-" + this).show();
                    obj.find(".mosaic-icon-menu-" + this).show();
                    obj.find(".mosaic-menu-" + this).show();
                    obj.find(".mosaic-option-" + this)
                        .show()
                        .attr("disabled", "");
                });

                // Set available fields
                obj.find(".mosaic-menu-insert")
                    .children(".mosaic-option-group-fields")
                    .children().each(function () {
                    if ($.mosaic.options.panels
                        .find(".mosaic-" + $(this).attr("value") + "-tile")
                        .length === 0) {
                        $(this).show().attr("disabled", "");
                    } else {
                        $(this).hide().attr("disabled", "disabled");
                    }
                });

                // Hide option group if no visible items
                obj.find(".mosaic-option-group").each(function () {
                    if ($(this).children(":enabled").length === 0) {
                        $(this).hide();
                    }
                });

                // Hide menu if no enabled items
                $(".mosaic-menu, .mosaic-icon-menu",
                  $.mosaic.document).each(function () {
                    if ($(this).find(".mosaic-option:enabled").length === 1) {
                        $(this).hide();
                    }
                });
            };

            // Bind method and add to array
            $(this).bind("selectedtilechange", SelectedTileChange);

            // Set default actions
            $(this).trigger("selectedtilechange");
        });
    };
}(jQuery));

define("mosaic.toolbar", function(){});

/**
 * This plugin is used to register and execute actions.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Global array containing actions and shortcuts
    $.mosaic.actionManager = {
        actions: [],                // Array with all the actions
        shortcuts: []               // Lookup array for shortcuts
    };

    /**
     * Register an action
     *
     * @id jQuery.mosaic.registerAction
     * @param {String} name Name of the action.
     * @param {Object} options Object containing all the options of the action
     */
    $.mosaic.registerAction = function (name, options) {

        // Extend default settings
        options = $.extend({

            // Handler for executing the action
            exec: function () {
            },

            // Shortcut can be any key + ctrl/shift/alt or a combination of
            // those
            shortcut: {
                ctrl: false,
                alt: false,
                shift: false,
                key: ""
            },

            // Method to see if the actions should be visible based on the
            // current tile state
            visible: function (tile) {
                return true;
            },

            // Should the action be undo-able?
            undoable: false

        }, options);

        // Add action to manager
        $.mosaic.actionManager.actions[name] = options;

        // Check if shortcut is defined
        if (options.shortcut.key !== "") {

            // Set keyCode and charCode
            options.shortcut.charCode = options.shortcut.key.toUpperCase()
                .charCodeAt(0);
            options.shortcut.action = name;

            // Set shortcut
            $.mosaic.actionManager.shortcuts.push(options.shortcut);
        }
    };

    /**
     * Execute an action
     *
     * @id jQuery.mosaicExecAction
     * @return {Object} Returns a jQuery object of the matched elements.
     */
    $.fn.mosaicExecAction = function () {

        // Loop through matched elements
        return this.each(function () {

            // Check if actions specified
            if ($(this).data("action") !== "") {

                var mgr = $.mosaic.actionManager;

                // Exec actions
                mgr.actions[$(this).data("action")].exec(this);
                if (mgr.actions[$(this).data("action")].undoable) {
                    $.mosaic.undo.snapshot();
                }
            }
        });
    };

    /**
     * Remove spans inserted by webkit
     *
     * @id jQuery.mosaic.fixWebkitSpan
     * @return {Object} jQuery object
     */
    $.mosaic.fixWebkitSpan = function () {
        var webkit_span = $(".Apple-style-span", $.mosaic.document);
        webkit_span.after(webkit_span.html());
        webkit_span.remove();
    };

    /**
     * Initialize the action manager
     *
     * @id jQuery.mosaic.initActions
     */
    $.mosaic.initActions = function () {

        // Register strong action
        $.mosaic.registerAction('strong', {
            exec: function () {
                $.mosaic.editor.applyFormat("strong");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: false,
                key: 'b'
            }
        });

        // Register emphasis action
        $.mosaic.registerAction('em', {
            exec: function () {
                $.mosaic.editor.applyFormat("em");
            }
        });

        // Register unordered list action
        $.mosaic.registerAction('ul', {
            exec: function () {
                $.mosaic.execCommand("InsertUnorderedList");
            }
        });

        // Register ordered list action
        $.mosaic.registerAction('ol', {
            exec: function () {
                $.mosaic.execCommand("InsertOrderedList");
            }
        });

        // Register undo action
        $.mosaic.registerAction('undo', {
            exec: function () {
                $.mosaic.execCommand("Undo");
            }
        });

        // Register redo action
        $.mosaic.registerAction('redo', {
            exec: function () {
                $.mosaic.execCommand("Redo");
            }
        });

        // Register paragraph action
        $.mosaic.registerAction('paragraph', {
            exec: function () {
                $.mosaic.editor.applyFormat("p");
            }
        });

        // Register heading action
        $.mosaic.registerAction('heading', {
            exec: function () {
                $.mosaic.editor.applyFormat("h2");
            }
        });

        // Register subheading action
        $.mosaic.registerAction('subheading', {
            exec: function () {
                $.mosaic.editor.applyFormat("h3");
            }
        });

        // Register discreet action
        $.mosaic.registerAction('discreet', {
            exec: function () {
                $.mosaic.editor.applyFormat("discreet");
            }
        });

        // Register literal action
        $.mosaic.registerAction('literal', {
            exec: function () {
                $.mosaic.editor.applyFormat("pre");
            }
        });

        // Register quote action
        $.mosaic.registerAction('quote', {
            exec: function () {
                $.mosaic.editor.applyFormat("pullquote");
            }
        });

        // Register callout action
        $.mosaic.registerAction('callout', {
            exec: function () {
                $.mosaic.editor.applyFormat("callout");
            }
        });

        // Register highlight action
        $.mosaic.registerAction('highlight', {
            exec: function () {
                $.mosaic.editor.applyFormat("highlight");
            }
        });

        // Register sub action
        $.mosaic.registerAction('sub', {
            exec: function () {
                $.mosaic.editor.applyFormat("sub");
            }
        });

        // Register sup action
        $.mosaic.registerAction('sup', {
            exec: function () {
                $.mosaic.editor.applyFormat("sup");
            }
        });

        // Register remove format action
        $.mosaic.registerAction('remove-format', {
            exec: function () {
                $.mosaic.editor.applyFormat("removeformat");
            }
        });

        // Register pagebreak action
        $.mosaic.registerAction('pagebreak', {
            exec: function () {
                $.mosaic.editor.applyFormat("pagebreak");
            }
        });

        // Register justify left action
        $.mosaic.registerAction('justify-left', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-left");
            }
        });

        // Register justify center action
        $.mosaic.registerAction('justify-center', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-center");
            }
        });

        // Register justify right action
        $.mosaic.registerAction('justify-right', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-right");
            }
        });

        // Register justify full action
        $.mosaic.registerAction('justify-justify', {
            exec: function () {
                $.mosaic.editor.applyFormat("justify-justify");
            }
        });

        // Register tile align block action
        $.mosaic.registerAction('tile-align-block', {
            exec: function () {

                // Remove left and right align classes
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .removeClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'b'
            }
        });

        // Register tile align left action
        $.mosaic.registerAction('tile-align-left', {
            exec: function () {

                // Remove right align class, add left align class
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-right")
                    .addClass("mosaic-tile-align-left");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'l'
            }
        });

        // Register tile align right action
        $.mosaic.registerAction('tile-align-right', {
            exec: function () {

                // Remove left align class, add right align class
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-tile-align-left")
                    .addClass("mosaic-tile-align-right");
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: true,
                key: 'r'
            }
        });

        // Register save action
        $.mosaic.registerAction('save', {
            exec: function () {
                $.mosaic.options.$el
                      .attr("value", $.mosaic.getPageContent());

                $("#form-buttons-save").click();
            },
            shortcut: {
                ctrl: true,
                alt: false,
                shift: false,
                key: 's'
            }
        });

        // Register cancel action
        $.mosaic.registerAction('cancel', {
            exec: function () {

                // Cancel form
                $("#form-buttons-cancel").click();
            }
        });

        // Register html action
        $.mosaic.registerAction('html', {
            exec: function () {

                // Local variables
                var tilecontent, text, height;

                // Get tile content div
                tilecontent = $(".mosaic-selected-tile", $.mosaic.document)
                                  .children(".mosaic-tile-content");

                // Check if not already html editable
                if (tilecontent.find('.mosaic-rich-text-textarea')
                        .length === 0) {

                    // Add new text area and set content
                    text = tilecontent.html();
                    height = tilecontent.height();
                    tilecontent.empty();
                    tilecontent.prepend(
                        $($.mosaic.document.createElement("textarea"))
                            .addClass("mosaic-rich-text-textarea")
                            .html($.trim(text))
                            .height(height));
                }
            }
        });

        // Register undo action
        $.mosaic.registerAction('undo', {
            exec: function () {
                $.mosaic.undo.undo();
            }
        });

        // Register redo action
        $.mosaic.registerAction('redo', {
            exec: function () {
                $.mosaic.undo.redo();
            }
        });

        // Register page properties action
        $.mosaic.registerAction('page-properties', {
            exec: function () {
                $.mosaic.overlay.open('all');
            }
        });

         // Register add tile action
        $.mosaic.registerAction('add-tile', {
            exec: function () {

                // Open overlay
                $.mosaic.overlay.openIframe($.mosaic.options.parent +
                    '@@add-tile?form.button.Create=Create');
            }
        });

        // Register format action
        $.mosaic.registerAction('format', {
            exec: function (source) {

                // Execute the action
                $(source).find("[value=" + $(source).val() + "]")
                    .mosaicExecAction();

                // Reset menu
                $(source).val("none");
            }
        });

        // Register page-insert action
        $.mosaic.registerAction('insert', {
            exec: function (source) {

                // Local variables
                var tile_config, tile_group, x, y;

                // Check if value selected
                if ($(source).val() === "none") {
                    return false;
                }

                // Deselect tiles
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();

                // Set actions
                $.mosaic.options.panels.trigger("selectedtilechange");

                // Get tile config
                for (x = 0; x < $.mosaic.options.tiles.length; x += 1) {
                    tile_group = $.mosaic.options.tiles[x];
                    for (y = 0; y < tile_group.tiles.length; y += 1) {
                        if (tile_group.tiles[y].name === $(source).val()) {
                            tile_config = tile_group.tiles[y];
                        }
                    }
                }

                if (tile_config.tile_type === 'app') {

                    // Open overlay
                    $.mosaic.overlay.openIframe($.mosaic.options.parent +
                        '@@add-tile?type=' + $(source).val() +
                        '&form.button.Create=Create');

                } else {

                    // Add tile
                    $.mosaic.addTile($(source).val(),
                        $.mosaic.getDefaultValue(tile_config));
                }

                // Reset menu
                $(source).val("none");

                // Normal exit
                return true;
            }
        });

        // Handle keypress event, check for shortcuts
        $(document).keypress(function (e) {

            // Action name
            var action = "";

            // Loop through shortcuts
            $($.mosaic.actionManager.shortcuts).each(function () {

                // Check if shortcut matched
                if (((e.ctrlKey === this.ctrl) ||
                     (navigator.userAgent.toLowerCase()
                        .indexOf('macintosh') !== -1 &&
                        e.metaKey === this.ctrl)) &&
                    ((e.altKey === this.alt) || (e.altKey === undefined)) &&
                    (e.shiftKey === this.shift) &&
                    (e.charCode && String.fromCharCode(e.charCode)
                        .toUpperCase().charCodeAt(0) === this.charCode)) {

                    // Found action
                    action = this.action;
                }
            });

            // Check if shortcut found
            if (action !== "") {

                // Exec actions
                $.mosaic.actionManager.actions[action].exec();

                if ($.mosaic.actionManager.actions[action].undoable) {
                    $.mosaic.undo.snapshot();
                }

                // Prevent other actions
                return false;
            }

            // Normal exit
            return true;
        });
    };
}(jQuery));

define("mosaic.actions", function(){});

/**
 * This plugin is used to upload files and images.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    /**
     * Initialize the upload module
     *
     * @id jQuery.mosaic.initUpload
     */
    $.mosaic.initUpload = function () {

        // Bind dragover
        $(".mosaic-panel", $.mosaic.document).bind("dragover", function (e) {

            // Check if drag not already loaded
            if ($(".mosaic-panel-dragging", $.mosaic.document).length === 0) {

                // Deselect tiles
                $(".mosaic-selected-tile", $.mosaic.document)
                    .removeClass("mosaic-selected-tile")
                    .children(".mosaic-tile-content").blur();

                // Set actions
                $.mosaic.options.toolbar.trigger("selectedtilechange");
                $.mosaic.options.panels.mosaicSetResizeHandleLocation();

                // Add dummy tile
                $.mosaic.addTile('image', '<img src="++resource++plone.app.' +
                    'mosaic.images/files.png" border="0" />');
            }
        });

        document.addEventListener(
            "drop",
            function (event) {
                // Local variables
                var dt, first, i, files, newtile, file, img, tile, xhr,
                    boundary, data;

                dt = event.dataTransfer;
                files = dt.files;

                // Prevent default actions
                event.stopPropagation();
                event.preventDefault();

                // Drop tile
                $($.mosaic.document).trigger("mousedown");

                // Check filetypes
                first = true;
                for (i = 0; i < files.length; i += 1) {

                    // Get file
                    file = files.item(i);

                    // Check if supported mimetype
                    if (file.mediaType.indexOf('image') === 0) {

                        // Check if first
                        if (first) {

                            // Set image and tile
                            img = $(".mosaic-selected-tile", $.mosaic.document)
                                .children(".mosaic-tile-content")
                                .children("img");
                            tile = $(".mosaic-selected-tile",
                                     $.mosaic.document);

                            // Set first to false
                            first = false;

                        // Not the first
                        } else {

                            // Create new tile
                            newtile = $($.mosaic.document.createElement("div"))
                                .addClass("movable removable mosaic-tile " +
                                          "mosaic-image-tile")
                                .append($($.mosaic.document.createElement("div"))
                                    .addClass("mosaic-tile-content")
                                    .append(
                                        $($.mosaic.document.createElement("img"))
                                            .attr("border", 0)
                                    )
                                );

                            // Insert new tile
                            $(".mosaic-selected-tile", $.mosaic.document)
                                .after(newtile);
                            newtile.mosaicInitTile();
                            newtile.mosaicAddDrag();

                            // Get image object
                            img = newtile.children(".mosaic-tile-content")
                                .children("img");
                            tile = newtile;
                        }

                        // Setup progress div
                        tile.append($($.mosaic.document.createElement("div"))
                            .addClass("mosaic-tile-uploadprogress")
                        );

                        // Set image values
                        img.get(0).src = file.getAsDataURL();

                        // Create new ajax request
                        xhr = new XMLHttpRequest();

                        // Set progress handler
                        xhr.upload.log = img;
                        /*
                        xhr.upload.addEventListener("progress",
                            function (event) {
                            if (event.lengthComputable) {
                                var percentage = Math.round((event.loaded *
                                    100) / event.total);
                                if (percentage < 100) {
                                    // console.log(percentage);
                                }
                            }
                        }
                        , false);
                        */

                        // Added load handler
                        xhr.addEventListener("load", function (event) {

                            // Get response
                            var response = eval('(' +
                                event.target.responseText + ')');

                            // Check if error
                            if (response.status === 1) {

                                // Raise error
                                $.plone.notify({
                                    type: "error",
                                    title: "Error",
                                    message: response.message,
                                    sticky: true
                                });

                            // No error
                            } else {

                                // Set url and alt and fadein
                                $(event.target.upload.log).attr({
                                    'src': response.url,
                                    'alt': response.title
                                })
                                .parents(".mosaic-tile")
                                    .children(".mosaic-tile-uploadprogress")
                                    .fadeOut("slow", function () {
                                        $(this).remove();
                                    });
                            }
                        }, false);

                        // Set error handler
                        xhr.upload.addEventListener("error", function (error) {
                            $.plone.notify({
                                type: "error",
                                title: "Error",
                                message: "Error uploading file: " + error,
                                sticky: true
                            });
                        }, false);

                        // Set boundary
                        boundary = "AJAX---------------------------AJAX";

                        // Open xhr and set content type
                        xhr.open("POST", $.mosaic.options.url + "/@@mosaic-upload",
                            true);
                        xhr.setRequestHeader('Content-Type',
                            'multipart/form-data; boundary=' + boundary);

                        // Add start boundary
                        data = "--" + boundary + "\r\n";

                        // Add file
                        data += 'Content-Disposition: form-data; ';
                        data += 'name="uploadfile"; ';
                        data += 'filename="' + file.fileName + '"' + "\r\n";
                        data += "Content-Type: " + file.mediaType;
                        data += "\r\n\r\n";
                        data += file.getAsBinary() + "\r\n";

                        // Add end boundary
                        data += "--" + boundary + "--" + "\r\n";

                        // Sent data
                        xhr.sendAsBinary(data);
                    } else {

                        // Notify unsupported
                        $.plone.notify({
                            type: "warning",
                            title: "Warning",
                            message: "The filetype of file " + file.fileName +
                                " is unsupported",
                            sticky: true
                        });
                    }
                }

                // Remove tile if no supported filetypes
                if (first) {
                    $(".mosaic-selected-tile", $.mosaic.document)
                        .find(".mosaic-close-icon")
                        .trigger("click");
                }
            },
            false
        );
    };
}(jQuery));

define("mosaic.upload", function(){});

/**
 * This plugin is used to set an element to be editable.
 *
 * @author Rob Gietema
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2011 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Define the editor namespace
    $.mosaic.editor = {
    };

    /**
    * Create a new instance of the mosaic editor.
    *
    * @constructor
    * @id jQuery.fn.mosaicEditor
    * @return {Object} Returns a new mosaic editor object.
    */
    $.fn.mosaicEditor = function () {
        var obj;

        // Get element
        obj = $(this);

        // Generate random id
        var random_id = 1 + Math.floor(100000 * Math.random());
        while ($("#mosaic-rich-text-init-" + random_id,
               $.mosaic.document).length > 0) {
            random_id = 1 + Math.floor(100000 * Math.random());
        }
        $(this).attr('id', 'mosaic-rich-text-init-' + random_id);

        // Init rich editor
        tinymce.init({
            selector: "#" + "mosaic-rich-text-init-" + random_id,
            theme: "modern",
            inline: true,
            schema: "html5",
            add_unload_trigger: false,
            toolbar: false,
            statusbar: false,
            menubar: false,
            formats : {
                strong : {inline : 'strong'},
                em : {inline : 'em'},
                h2 : {block : 'h2', remove : 'all'},
                h3 : {block : 'h3', remove : 'all'},
                p : {block : 'p', remove : 'all'},
                sub : {inline : 'sub', remove : 'all'},
                sup : {inline : 'sup', remove : 'all'},
                discreet : {block : 'p',
                            attributes : {'class' : 'discreet'},
                            remove : 'all'},
                pre : {block : 'pre', remove : 'all'},
                pullquote : {block: 'q',
                             attributes: {'class' : 'pullquote'},
                             remove: 'all'},
                callout : {block: 'p',
                           attributes: {'class' : 'callout'},
                           remove: 'all'},
                highlight : {inline: 'span',
                             attributes: {'class' : 'visualHighlight'},
                             remove: 'all'},
                pagebreak : {block: 'p',
                             attributes: {'class' : 'pagebreak'},
                             remove: 'all'},
                'justify-left' : {selector: 'p,h2,h3,pre,q',
                                  attributes: {'class' : 'justify-left'},
                                  remove: 'all'},
                'justify-center' : {selector: 'p,h2,h3,pre,q',
                                    attributes: {'class' : 'justify-center'},
                                    remove: 'all'},
                'justify-right' : {selector: 'p,h2,h3,pre,q',
                                   attributes: {'class' : 'justify-right'},
                                   remove: 'all'},
                'justify-justify' : {selector: 'p,h2,h3,pre,q',
                                     attributes: {'class' : 'justify-justify'},
                                     remove: 'all'}
            }
        });

        // Set editor class
        obj.addClass('mosaic-rich-text');
    };

    /**
     * Exec a command on the editor
     *
     * @id jQuery.mosaic.execCommand
     * @param {String} command Command to execute
     * @param {String} ui UI to use
     * @param {String} value Vale of the command
     */
    $.mosaic.execCommand = function (command, ui, value) {

        // Exec command
        tinymce.activeEditor.execCommand(command, ui, value);
    };

    /**
     * Apply formatting to the current selection
     *
     * @id jQuery.mosaic.editor.applyFormat
     * @param {String} format Name of the registered format to apply
     */
    $.mosaic.editor.applyFormat = function (format) {

        // Apply format
        tinyMCE.activeEditor.formatter.apply(format);
    };

    /**
     * Register format
     *
     * @id jQuery.mosaic.editor.registerFormat
     * @param {String} name Name of the registered format to apply
     * @param {Object} format Formatting object
     */
    $.mosaic.editor.registerFormat = function (name, format) {

        // Apply format
        tinymce.activeEditor.formatter.register(name, format);
    };

})(jQuery);


define("mosaic.editor", function(){});

/**
 * This plugin is used to create the mosaic undo stack, and enable
 * undo/redo actions. The JS defines two classes, one for internal use
 * ($.mosaic.undo.Stack) and the public one $.mosaic.unto.UndoManager. The
 * latter needs to be initialized (form the mosaic core), using:
 *  - stack size (max undo history)
 *  - reference to a handler that is called with the state as argument on undo/redo
 *  - current state (optional)
 *
 * The state can be anyting, but a feasible use is a DOM snippet as
 * state, that can be re-applied to an element on undo/redo.  Check
 * out plone.app.mosaic/plone/app/mosaic/tests/javascipts/test_undo.html
 * for an example wiring.
 *
 * Currently for mosaic the 'public' methods of the module are 'init',
 * 'undo', 'redo', 'hasInitial' and 'snapshot'. The undo manager
 * always needs an intial state (to be able to redo the undo...). A
 * state can be added with the jQuery.mosaic.undo.snapshot
 * method. Always take the snapshot AFTER the change in the DOM.
 *
 * @author D.A.Dokter
 * @version 0.1
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 */


/*global jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Define mosaic namespace if it doesn't exist
    if (typeof($.mosaic) === "undefined") {
        $.mosaic = {};
    }

    // Declare mosaic.undo namespace
    $.mosaic.undo = function () {};

    /**
     * Initialize undo manager.
     * @id jQuery.mosaic.undo.init
     */
    $.mosaic.undo.init = function () {

        function handler(state) {

            for (var i = 0; i < state.length; i += 1) {
                $("#" + state[i].target, $.mosaic.document)
                    .html(state[i].source);
            }
        }

        $.mosaic.undo.undoManager =  new $.mosaic.undo.UndoManager(10, handler);
    };


    /**
     * Create a snapshot of the current situation, and add it to the
     * undo manager.
     * @id jQuery.mosaic.undo.snapshot
     */
    $.mosaic.undo.snapshot = function () {
        var state = [];
        $(".mosaic-panel", $.mosaic.document).each(function () {
            state.push({"target": $(this).attr("id"),
                        "source": $(this).html()});
        });
        if (typeof($.mosaic.undo.undoManager) === "undefined") {
            $.mosaic.undo.init();
        }

        $.mosaic.undo.undoManager.add(state);
    };


    /**
     *
     */
    $.mosaic.undo.hasInitial = function () {
        if ($.mosaic.undo.undoManager.stack.size() > 0) {
            return true;
        } else {
            return false;
        }
    };


    /**
     * Undo.
     * @id jQuery.mosaic.undo.undo
     */
    $.mosaic.undo.undo = function () {
        $.mosaic.undo.undoManager.undo();
    };


    /**
     * Redo.
     * @id jQuery.mosaic.undo.redo
     */
    $.mosaic.undo.redo = function () {
        $.mosaic.undo.undoManager.redo();
    };


    /**
     * Stack constructor, taking optional size parameter.
     * @id jQuery.mosaic.undo.Stack
     * @param {Integer} stackSize Maximum number of items on the stack.
     */
    $.mosaic.undo.Stack = function (stackSize) {
        if (typeof(stackSize) === "undefined") {
            this.maxsize = 10;
        } else {
            this.maxsize = stackSize;
        }

        this.stack = [];
    };

    /**
     * Return current stack size.
     * @id jQuery.mosaic.undo.Stack.size
     */
    $.mosaic.undo.Stack.prototype.size  = function () {
        return this.stack.length;
    };

    /**
     * FIFO stack push, that removes object at other end if the stack
     * grows bigger than the size set.
     * @id jQuery.mosaic.undo.Stack.add
     * @param {Object} obj Object to push onto the stack.
     */
    $.mosaic.undo.Stack.prototype.add = function (obj) {

        if (this.stack.length >= this.maxsize) {
            this.stack.pop();
        }

        this.stack.unshift(obj);
    };

    /**
     * Get the object at the given index. Note that new states (added
     * through jQuery.mosaic.undo.Stack.add) are added (using shift) at index 0.
     * @id jQuery.mosaic.undo.Stack.get
     */
    $.mosaic.undo.Stack.prototype.get = function (i) {
        return this.stack[i];
    };

    /**
     * Undo manager, handling calls to undo/redo. This implementation
     * uses full DOM snippets.
     * @id jQuery.mosaic.undo.UndoManager
     * @param {Integer} stackSize max undo history
     * @param {Function} handler for undo/redo, taking state as argument
     * @param {Object} currentState Current state
     */
    $.mosaic.undo.UndoManager = function (stackSize, handler, currentState) {

        this.stack = new $.mosaic.undo.Stack(stackSize);
        this.pointer = 0;
        this.handler = handler;
        if (typeof(currentState) !== "undefined") {
            this.stack.add(currentState);
        }
    };

    /**
     * Add state to manager.
     * @id jQuery.mosaic.undo.UndoManager.add
     * @param {Object} state State to add.
     */
    $.mosaic.undo.UndoManager.prototype.add = function (state) {

        this.stack.add(state);
    };

    /**
     * Undo last action, by restoring last state.
     * @id jQuery.mosaic.undo.UndoManager.undo
     */
    $.mosaic.undo.UndoManager.prototype.undo = function  () {

        var state = this.stack.get(this.pointer + 1);

        if (state) {
            this.handler(state);
            this.pointer += 1;
        } else {
          // Alert there's no (more) states.
        }
    };

    /**
     * Redo last action, by calling handler with previous state.
     * @id jQuery.mosaic.undo.UndoManager.redo
     */
    $.mosaic.undo.UndoManager.prototype.redo = function () {

        var state = this.stack.get(this.pointer - 1);

        if (state) {
            this.handler(state);
            this.pointer -= 1;
        } else {
            // Alert there's no (more) states.
        }
    };

}(jQuery));

define("mosaic.undo", function(){});

/**
 * This plugin is used to trigger the editing of tiles in an overlay
 *
 * @author Rob Gietema
 * @licstart  The following is the entire license notice for the JavaScript
 *            code in this page.
 *
 * Copyright (C) 2010 Plone Foundation
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @licend  The above is the entire license notice for the JavaScript code in
 *          this page.
 * @version 0.1
 */


/*global tiledata: false, jQuery: false, window: false */
/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true,
eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true,
immed: true, strict: true, maxlen: 80, maxerr: 9999 */

(function ($) {

    // Init on load
    $(window).load(function () {

        // Check if tiledata is available and valid
        if (typeof(tiledata) !== 'undefined') {

            // Check action
            if (tiledata.action === 'cancel') {

                // Close overlay
                window.parent.frames['plone-cmsui-menu'].jQuery.mosaic.overlay.close();

            } else if (tiledata.action === 'save') {

                // Check mode
                if (tiledata.mode === 'add') {

                    // Check url
                    if (typeof(tiledata.url) !== 'undefined') {

                        // Insert app tile
                         window.parent.frames['plone-cmsui-menu'].jQuery.mosaic.addAppTile(tiledata.tile_type,
                            tiledata.url, tiledata.id);
                    }
                } else {

                    // Update app tile
                     window.parent.frames['plone-cmsui-menu'].jQuery.mosaic.editAppTile(tiledata.url);
                }
            }
        }
    });

}(jQuery));


define("mosaic.overlaytriggers", function(){});

/* Layout Mosaic pattern.
 *
 * Options:
 *
 * Documentation:
 *
 * License:
 *    Copyright (C) 2014 Plone Foundation
 *
 *    This program is free software; you can redistribute it and/or modify it
 *    under the terms of the GNU General Public License as published by the
 *    Free Software Foundation; either version 2 of the License.
 *
 *    This program is distributed in the hope that it will be useful, but
 *    WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 *    Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License along
 *    with this program; if not, write to the Free Software Foundation, Inc.,
 *    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

require([
  'requirejs',
  'jquery',
  'mockup-registry',
  'mockup-patterns-base',
  'mosaic.core',
  'mosaic.overlay',
  'mosaic.tinymce',
  'mosaic.layout',
  'mosaic.toolbar',
  'mosaic.actions',
  'mosaic.upload',
  'mosaic.editor',
  'mosaic.undo',
  'mosaic.overlaytriggers'
], function(undefined, $, Registry, Base) {
  

  var Layout = Base.extend({
    name: 'layout',
    defaults: {
      attribute: 'class',
    },
    init: function() {
      var self = this;
      self.options.data.$el = self.$el;
      $.mosaic.init({'data': self.options.data});

    }

  });

  // initialize only if we are in top frame
  // if (window.parent === window) {
  //   $(document).ready(function() {
  //     $('body').addClass('pat-test');
  //     Registry.scan($('body'));
  //   });
  // }

  return Layout;

});

define("src/plone/app/mosaic/browser/javascripts/mosaic.pattern", function(){});

