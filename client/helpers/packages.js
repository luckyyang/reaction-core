/*
 *
 * reactionApps
 *
 *   provides="<where matching registry provides is this >"
 *   enabled=true <false for disabled packages>
 *   context= true filter templates to current route
 *
 * returns matching package registry objects
 *  TODO: rewrite in ES6
 *  TODO:
 *   -
 *   - reintroduce a dependency context
 *   - introduce position,zones #148
 *   - is it better to get all packages once and filter in code
 *     and possibly have some cache benefits down the road,
 *     or to retrieve what is requested and gain the advantage of priviledged,
 *     unnecessary data not retrieved with the cost of additional requests.
 *   - context filter should be considered experimental
 *
 */


Template.registerHelper("reactionApps", function (options) {
  var app, fields, filter, index, key, match, packages, pkg, reactionApps, reactionPackages, registry, registryFilter, value, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
  var packageSubscription = Meteor.subscribe("Packages");

  if (packageSubscription.ready()) {

    if (!options.hash.shopId) {
      options.hash.shopId = ReactionCore.getShopId();
    }

    reactionApps = [];
    filter = {};
    registryFilter = {};
    _ref = options.hash;

    for (key in _ref) {
      value = _ref[key];
      if (!(key === 'enabled' || key === 'name' || key === 'shopId')) {
        filter['registry.' + key] = value;
        registryFilter[key] = value;
      } else {
        filter[key] = value;
      }
    }
    fields = {
      'enabled': 1,
      'registry': 1,
      'name': 1
    };

    reactionPackages = ReactionCore.Collections.Packages.find(filter, fields).fetch();

    if (!reactionPackages) {
      throw new Error("Packages not loaded.");
    }

    if (filter.name && filter.enabled) {
      packages = (function () {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = reactionPackages.length; _i < _len; _i++) {
          pkg = reactionPackages[_i];
          if (pkg.name === filter.name && pkg.enabled === filter.enabled) {
            _results.push(pkg);
          }
        }
        return _results;
      })();
    } else if (filter.name) {
      packages = (function () {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = reactionPackages.length; _i < _len; _i++) {
          pkg = reactionPackages[_i];
          if (pkg.name === filter.name) {
            _results.push(pkg);
          }
        }
        return _results;
      })();
    } else if (filter.enabled) {
      packages = (function () {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = reactionPackages.length; _i < _len; _i++) {
          pkg = reactionPackages[_i];
          if (pkg.enabled === filter.enabled) {
            _results.push(pkg);
          }
        }
        return _results;
      })();
    } else {
      packages = (function () {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = reactionPackages.length; _i < _len; _i++) {
          pkg = reactionPackages[_i];
          _results.push(pkg);
        }
        return _results;
      })();
    }

    for (_i = 0, _len = packages.length; _i < _len; _i++) {
      app = packages[_i];
      _ref1 = app.registry;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        registry = _ref1[_j];
        match = 0;
        for (key in registryFilter) {
          value = registryFilter[key];
          if (registry[key] === value) {
            match += 1;
          }
          if (match === Object.keys(registryFilter).length) {
            registry.name = app.name;
            if (registry.enabled !== false) {
              registry.enabled = registry.enabled || app.enabled;
              registry.packageId = app._id;
              reactionApps.push(registry);
            }
          }
        }
      }
    }

    reactionApps = _.uniq(reactionApps);

    for (index = _k = 0, _len2 = reactionApps.length; _k < _len2; index = ++_k) {
      app = reactionApps[index];
      if (!app.priority) {
        reactionApps[index].priority = index;
      }
    }

    return reactionApps;
  }
});

/**
 * reactionTemplate helper
 * @summary reactionTemplate provides templates as defined in ReactionRegistry.Layout
 * @param {String} workflow defaults to "default"
 * @param {String} workflow
 * @returns
 */


Template.registerHelper("reactionTemplate", function (options) {

  var shopId = options.hash.shopId || ReactionCore.getShopId();
  // get shop info, defaults to current
  var Shop = ReactionCore.Collections.Shops.findOne(shopId);
  var currentCart = ReactionCore.Collections.Cart.findOne({
    'userId': Meteor.userId()
  });
  var currentStatus = currentCart.workflow.status;
  var layoutConfiguration = Shop.layout;
  var reactionTemplates = [];

  // find the packages with these options
  var Packages = ReactionCore.Collections.Packages.find({ layout: { $elemMatch: options.hash } } );
  //  we can have multiple packages contributing to the layout / workflow
  Packages.forEach(function (package) {
    // match template or workflow
    var layoutWorkflows = _.where(package.layout, options.hash);

    _.each(layoutWorkflows, function (layout) {
      // audience is layout permissions
      if (layout.audience === undefined) {
        defaultRoles = ReactionCore.Collections.Shops.findOne().defaultRoles;
        layout.audience = defaultRoles;
      }

      // check permissions so you don't have to on template.
      if (ReactionCore.hasPermission(layout.audience)) {
        layout.status = _.contains(currentCart.workflow.workflow, layout.template);
        // if the current template is already the current status
        if (layout.template === currentStatus) {
          layout.status = currentStatus;
        }
        // add to templates list
        reactionTemplates.push(layout);
      }

    });
  });

  //console.table(reactionTemplates);

  return reactionTemplates;

});
