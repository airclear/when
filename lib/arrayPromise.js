/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	// TODO: port settle, any, some. Consider: join

	var bind, uncurryThis, uncurryThisApply, arrayProto,
		slice, filter, concat, forEach, map, reduce, reduceRight, undef;

	arrayProto = [];
	bind = Function.prototype.bind;
	uncurryThis = bind.bind(bind.call);
	uncurryThisApply = bind.bind(bind.apply);
	slice = uncurryThis(arrayProto.slice);
	map = uncurryThis(arrayProto.map);
	filter = uncurryThis(arrayProto.filter);
	concat = uncurryThisApply(arrayProto.concat);
	forEach = uncurryThis(arrayProto.forEach);
	reduce = uncurryThisApply(arrayProto.reduce);
	reduceRight = uncurryThisApply(arrayProto.reduceRight);

	return {
		all: function() {
			var valueType = this.valueType;
			return this.then(function(array) {
				return valueType.promise(resolveAll);

				function resolveAll(resolve, reject, notify) {
					var results, toResolve;

					results = [];
					if(!(array.length >>> 0)) {
						resolve(results);
						return;
					}

					toResolve = 0;

					forEach(array, function resolveOne(item, i) {
						toResolve++;
						valueType(item).then(function(item) {
							results[i] = item;

							if(!--toResolve) {
								resolve(results);
							}
						}, reject, notify);
					});
				}
			});
		},
		settle: function() {
			var valueType = this.valueType;

			return this.then(resolveSettle).all();

			function resolveSettle(array) {
				return array.map(function(x) {
					return valueType(x).then(
						valueType.toFulfilledState,
						valueType.toRejectedState
					);
				});
			}
		},
		spread: function(f) {
			return this.all().then(function(array) {
				return f.apply(undef, array);
			});
		},
		map: function(f) {
			var valueType = this.valueType;

			return this.then(resolveMap);

			function resolveMap(array) {
				return map(array, function(x) {
					return valueType(x).then(f);
				});
			}
		},
		reduce: function(reduceFunc) {
			var valueType, args;

			valueType = this.valueType;
			args = slice(arguments);

			return this.then(resolveReduce);

			// TODO: Allow passing in result promise type hint
			// rather than relying on valueType here
			function resolveReduce(array) {
				args[0] = makeReducer(reduceFunc, array.length, valueType);
				return reduce(array, args);
			}
		},
		reduceRight: function(reduceFunc) {
			var valueType, args;

			valueType = this.valueType;
			args = slice(arguments);

			return this.then(resolveReduce);

			// TODO: Allow passing in result promise type hint
			// rather than relying on valueType here
			function resolveReduce(array) {
				args[0] = makeReducer(reduceFunc, array.length, valueType);
				return reduceRight(array, args);
			}
		},
		filter: function(f) {
			return this.all().then(function(contents) {
				return contents.filter(f);
			});
		},
		concat: function(/* ...tails */) {
			var args = this.ownType(arguments);

			return this.then(function(head) {
				return args.all().then(function(tails) {
					return concat(head, tails);
				});
			});
		},
		slice: function(start, end) {
			return this.then(function(arr) {
				return slice(arr, start, end);
			});
		},
		forEach: function(f) {
			var valueType = this.valueType;
			return this.then(function(array) {
				return forEach(array, function(x) {
					// Intentionally ignore the return value.
					// TODO: What if f returns a rejected promise?
					valueType(x).then(f);
				});
			});
		}
	};

	function makeReducer(reduceFunc, total, resultType) {
		return function (current, val, i) {
			return resultType(current).then(function (c) {
				return resultType(val).then(function (value) {
					return reduceFunc(c, value, i, total);
				});
			});
		};
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));