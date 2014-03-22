// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################
_storageAdapters = {};

FS.StorageAdapter = function(name, options, api) {
  var self = this;

  // If name is the only argument, a string and the SA allready found
  // we will just return that SA
  if (arguments.length === 1 && name === '' + name &&
          typeof _storageAdapters[name] !== 'undefined')
    return _storageAdapters[name];

  // Check the api
  if (typeof api === 'undefined') {
    throw new Error('FS.StorageAdapter please define an api');
  }

  // Deprecate put & get maybe refactor del into remove
  _.each('del,typeName,createReadStream,createWriteStream'.split(','), function(name) {
    if (typeof api[name] === 'undefined') {
      throw new Error('FS.StorageAdapter please define an api.' + name + '');
    }
  });

  // store reference for easy lookup by name
  if (typeof _storageAdapters[name] !== 'undefined') {
    throw new Error('Storage name already exists: "' + name + '"');
  } else {
    _storageAdapters[name] = self;
  }

  // extend self with options and other info
  _.extend(this, options || {}, {
    name: name
  });

  // This supports optional transformWrite and transformRead
  self._transform = new FS.Transform({
    store: api,
    // Optional transformation functions:
    transformWrite: options.transformWrite,
    transformRead: options.transformRead
  });

delete options.transformWrite;
delete options.transformRead;

  // Create a nicer abstracted adapter interface
  self.adapter = {};

  // Return readable stream
  self.adapter.createReadStream = function(fileObj, options) {
    FS.debug && console.log('createReadStream ' + self.name);

    return FS.Utility.safeStream( self._transform.createReadStream(fileObj, options) );

  };

  // Return readable stream
  self.adapter.createWriteStream = function(fileObj, options) {

    FS.debug && console.log('createWriteStream ' + self.name);

    if (typeof fileObj.copies == 'undefined' || fileObj.copies === null) {
      fileObj.copies = {};
    }
    if (typeof fileObj.copies[self.name] === 'undefined') {
      fileObj.copies[self.name] = {
        name: fileObj.name,
        type: fileObj.type,
        size: fileObj.size
      };
    }

    var writeStream = FS.Utility.safeStream( self._transform.createWriteStream(fileObj, options) );


    if (FS.debug) {
      writeStream.on('stored', function() {
        console.log('-----------STORED STREAM', name);
      });

      writeStream.on('close', function() {
        console.log('-----------CLOSE STREAM', name);
      });

      writeStream.on('end', function() {
        console.log('-----------END STREAM', name);
      });

      writeStream.on('finish', function() {
        console.log('-----------FINISH STREAM', name);
      });

      writeStream.on('error', function() {
        console.log('-----------ERROR STREAM', name);
      });
    }

    // Its really only the storage adapter who knows if the file is uploaded
    //
    // We have to use our own event making sure the storage process is completed
    // this is mainly
    writeStream.safeOn('stored', function() {

      // Update the time - this could also be fetched from api.stats in the
      // storage adapter eg. by adding on event
      fileObj.copies[name].utime = Date();

      var modifier = {};
      modifier["copies." + name] = fileObj.copies[name];
      // Update the main file object with the modifier
      fileObj.update({$set: modifier});

    });


    return writeStream;
  };


  //internal
  self._removeAsync = function(fsFile, callback) {
    // Remove the file from the store
    api.del.call(self, fsFile, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.remove
   * @public
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] unused
   * @param {Function} [callback] If not provided, will block and return true or false
   * @todo refactor into self.adapter.remove to make the adapter interface complete
   *
   * Attempts to remove a file from the store. Returns true if removed or not
   * found, or false if the file couldn't be removed.
   */
  self.remove = function(fsFile, options, callback) {
    FS.debug && console.log("---SA REMOVE");
    if (!(fsFile instanceof FS.File))
      throw new Error('Storage adapter "' + name + '" remove requires fsFile');

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};

    if (callback) {
      return self._removeAsync(fsFile, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._removeAsync)(fsFile);
    }
  };

  if (typeof api.init === 'function') {
    Meteor._wrapAsync(api.init.bind(self))();
  }

};
