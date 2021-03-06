/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrVirtualDirectory
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a virtual directory (for manually sorting files)
 *
 *                  How it works:
 *                  1. Always holds a pointer to its "real" directory
 *                  2. On every read and write, the realDirectories are refreshed
 *                  3. Add and remove cause writes, read only once (constructor)
 *
 * END HEADER
 */

const path = require('path')

// Include helpers
const hash = require('../common/util/hash')
const sort = require('../common/util/sort')

const ZettlrAlias = require('./zettlr-alias')

const ALLOW_SORTS = [ 'name-up', 'name-down', 'time-up', 'time-down' ]

/**
 * Manages one single virtual directory containing manually added files. This
 * file is _NOT_ generated by ZettlrDir itself, but a helper function located
 * in common/zettlr-directory-helpers.js. This way, it's possible to add as many directory
 * class as one likes (virtual directories and filters are one possibility. Also
 * thinkable would be virtual project directories as well, or weblink directories.)
 */
class ZettlrVirtualDirectory {
  /**
   * Initialises the virtual directories for a given directory.
   * @param {ZettlrDir} dir   The containing directory.
   * @param {Array} vd    An array of files inside this directory.
   * @param {ZettlrInterface} model The ZettlrInterface
   */
  constructor (dir, vd) {
    this._vd = vd
    this.parent = dir
    this.name = this._vd.name
    this.path = path.join(this.parent.path, this.name)
    this.hash = hash(this.path)
    this.children = []
    this.type = 'virtual-directory'
    this.sorting = 'name-up'
    // Read in children from file
    this.init()
  }

  /**
   * Initially read all files present in the vd object
   */
  init () {
    for (let file in this._vd.aliases) {
      // Signature: this, name, path
      this.children.push(new ZettlrAlias(this, file, this._vd.aliases[file]))
    }
  }

  /**
   * Shuts down the virtual directory, saves the last changes and quits.
   */
  shutdown () {
    // Nothing to do
  }

  /**
   * Serves as a dummy function so we don't have to check on ZettlrDir's
   * handleEvent function.
   * @param  {String} p The path to be checked for.
   * @param  {String} e The event type.
   * @return {Boolean} Always false, because events don't trigger changes here.
   */
  handleEvent (p, e) {
  // TODO: Needs to listen for unlink-events of files and check all children
  // if they're still there!
    return false
  }

  /**
   * Returns the virtual directory instance or null.
   * @param  {Object} obj An object containing a hash.
   * @return {Mixed}     Either this or null.
   */
  findDir (obj) {
    if (obj.hasOwnProperty('hash') && obj.hash === this.hash) return this
    if (obj.hasOwnProperty('path') && obj.path === this.path) return this
    return null
  }

  /**
   * Returns a file from within this virtual directory (if its still there).
   * @param  {Object} obj An object containing either a path or a hash property.
   * @return {Mixed}     A ZettlrFile or null.
   */
  findFile (obj) {
    // Traverse the children
    for (let c of this.children) {
      let file = c.findFile(obj)
      if (file) return file
    }

    // Not found
    return null
  }

  /**
   * Returns an exact match, if possible.
   * @param  {String} term The search term.
   * @return {Mixed}      Either a ZettlrFile or null.
   */
  findExact (term) {
    for (let c of this.children) {
      let file = c.findExact(term)
      if (file != null) return file
    }

    return null
  }

  /**
   * Return a specific file based on its hash.
   * @param  {Number} hash The hash to be searched for
   * @return {Mixed}      Either a ZettlrFile object, or null.
   */
  get (hash) {
    for (let c of this.children) {
      let cnt = c.get(hash)
      if (cnt != null) return cnt
    }

    return null
  }

  /**
   * Renames an alias.
   * @param  {String} oldname The old alias name
   * @param  {String} newname The new name.
   * @return {ZettlrVirtualDirectory} This.
   */
  renameFile (oldname, newname) {
    let temp = this._vd.aliases[oldname]
    delete this._vd.aliases[oldname]
    this._vd.aliases[newname] = temp
    return this
  }

  /**
   * Removes either a file from this VD or this VD from the containing dir.
   * @param  {Object} [obj=this] Either this or a specific file that has called this function.
   * @return {Boolean}            Whether or not the remove operation was successful.
   */
  remove (obj = this) {
    if (obj === this) {
      // Remove this directory
      this.detach()
    } else {
      // Remove a file
      let index = this.children.indexOf(obj)

      // Should (normally) always be true.
      if (index > -1) {
        this.children.splice(index, 1)
        // Also remove from the parent's settings
        delete this._vd.aliases[obj.name]
      } else {
        // Fail gracefully
        return false
      }
    }

    return true
  }

  /**
   * Although this function is in normal directories used to move and rename
   * the directory, for virtual directories it can only rename them.
   * @param  {String} newpath     The new path (not used, only for API consistency)
   * @param  {string} [name=null] The new directory name.
   * @return {ZettlrVirtualDirectory}             This (chainability)
   */
  move (newpath, name = null) {
    // Name must be given for virtual directories.
    if (!name) {
      return this
    }

    // Update model!
    let oldname = this.name
    this.name = name // No need to detach on rename
    this._updateModel(oldname)

    // But what we want to do is have the parent re-sort its children
    this.parent.sort()
    this.hash = hash(this.path + this.name)
    // Chainability
    return this
  }

  /**
   * Add a new file to this directory.
   * @param  {ZettlrFile} newchild The file to be added
   * @return {ZettlrVirtualDirectory}          This for chainability.
   */
  attach (newchild) {
    // First check that there's no symbolic link pointing to that file already.
    let found = this.children.find(e => e.getAlias() === newchild.hash)
    // Property checker to determine that this alias is not already taken
    let basename = path.basename(newchild.name, path.extname(newchild.name))
    let prop = this._vd.aliases.hasOwnProperty(basename)
    let relPath = path.relative(this.getRootPath(), newchild.path)
    if (!found && !prop) {
      // Add a new alias to the file
      this._vd.aliases[basename] = relPath
      // Signature: this, name, path
      this.children.push(new ZettlrAlias(this, basename, relPath))
      console.log('Added alias to', relPath)
    } else {
      console.log('Couldnt do it')
      console.log('Basename', basename)
      console.log('prop exists?', prop)
      console.log('relpath', relPath)
      console.log('found?', found != null)
    }
    return this
  }

  /**
   * Detaches this virtual directory from its containing directory.
   * @return {ZettlrVirtualDirectory} This for chainability.
   */
  detach () {
    this.parent.remove(this)
    return this
  }

  /**
   * Changes the sorting mechanism and re-sorts the directory.
   * @param  {String} [type='name-up'] The new sorting mechanism.
   * @return {ZettlrVirtualDirectory}  This for chainability.
   */
  toggleSorting (type = 'name-up') {
    if (ALLOW_SORTS.includes(type)) {
      this.sorting = type
    } else if (type.indexOf('name') > -1) {
      if (this.sorting === 'name-up') {
        this.sorting = 'name-down'
      } else {
        this.sorting = 'name-up'
      }
    } else if (type.indexOf('time') > -1) {
      if (this.sorting === 'time-up') {
        this.sorting = 'time-down'
      } else {
        this.sorting = 'time-up'
      }
    } else {
      this.sorting = 'name-up'
    }

    this.sort()
    return this
  }

  /**
   * Checks if a path exists inside this -> Always return false, as VDs don't
   * contain files.
   * @param  {String} p The path to be checked.
   * @return {null}   Always null, as VDs don't contain files.
   */
  exists (p) { return null }

  /**
   * Checks whether or not a given object is present in this virtual directory.
   * @param  {Object} obj Either a number, or an object containing a hash
   * @return {Boolean}     True, if a file is present here, or false.
   */
  contains (obj) {
    if (!obj) return false

    if (typeof obj === 'number') {
      // Same problem as in the find-methods. Only here I don't care anymore.
      // Simply assume a hash. Nothing else could be it.
      obj = { 'hash': obj }
    } else if (!obj.hasOwnProperty('hash')) {
      // Prevent errors.
      return false
    }

    if (this.findDir({ 'hash': obj.hash }) !== null) {
      return true
    } else if (this.findFile({ 'hash': obj.hash }) !== null) {
      // Try a file
      return true
    }

    return false
  }

  /**
   * Returns null, as Virtual directories don't have children.
   * @param  {Object}  obj An object, which will be omitted.
   * @return {null}     Always returns null.
   */
  hasChild (obj) { return null }

  /**
   * Re-sorts this virtual directory.
   * @return {ZettlrVirtualDirectory} This for chainability.
   */
  sort () {
    this.children = sort(this.children, this.sorting)
    return this
  }

  /**
   * Returns the virtual directory's metadata
   * @return {Object} An object containing only the metadata fields
   */
  getMetadata () {
    // For VDs we don't need the circular prevention b/c none of the children
    // have this as their parent.
    return {
      'parent': null,
      'path': this.path,
      'name': this.name,
      'hash': this.hash,
      'children': this.children.map(elem => elem.getMetadata(false)),
      'attachments': [],
      'type': this.type,
      'sorting': this.sorting
    }
  }

  /**
   * Returns the hash of this VD.
   * @return {Number} The hash.
   */
  getHash () { return this.hash }

  /**
   * Returns the path of this directory.
   * @return {String} The path (always an empty string).
   */
  getPath () { return '' }

  /**
   * Returns the name of this virtual directory.
   * @return {String} The name.
   */
  getName () { return this.name }

  /**
   * Returns whether or not this is a directory.
   * @return {Boolean} Always true, for this is a directory.
   */
  isDirectory () {
    // In this very instance, we may respectfully pretend to be a directory
    return true
  }

  /**
   * Dummy function for recursive use. Always returns true.
   * @return {Boolean} Returns true.
   */
  isVirtualDirectory () { return true }

  /**
   * Returns whether or not this is a file.
   * @return {Boolean} Always false, for this is not a file.
   */
  isFile () { return false }

  /**
   * Returns whether or not this is a root.
   * @return {Boolean} Always false, because VDs can't be roots.
   */
  isRoot () { return false }

  /**
   * Returns whether or not the given path is inside this object's scope.
   * @param  {String}  p The path to be checked.
   * @return {Boolean}   Always false, for a VD can't handle events.
   */
  isScope (p) {
    // Must return false, because we're not a real directory, the real parent
    // should handle this case.
    return false
  }

  /**
   *   HELPER FUNCTIONS
   */

  /**
    * Updates the model with the current data.
    */
  update () {
    // This function is called whenever an included file changes its path to
    // make sure files that have been moved outside will be removed.
    for (let c of this.children) {
      if (!this.parent.contains(c)) {
        // Remove
        this.children.splice(this.children.indexOf(c), 1)
      }
    }

    // Update
    this._updateModel()
  }

  /**
    * Write changes to the model
    * @param  {String} [rowname=this.name] If the name has changed, this is the possibility to give the correct one.
    */
  _updateModel (rowname = this.name) {
    let arr = []
    for (let c of this.children) {
      if (c.isFile() && this.parent.contains(c)) { // Doublecheck if this is still the case.
        arr.push(this._makeRelative(c.path))
      }
    }

    // let nData = { 'name': this.name, 'files': arr }

    // this._model.set(rowname, nData)
  }

  /**
   * Makes a path relative (extracts the root directory's path from interval)
   * @param  {String} p The path to be returned relative
   * @return {String}   The relative path
   */
  _makeRelative (p) {
    if (this._isAbsolute(p)) {
      return p.replace(this.getRootPath(), '')
    }

    return p
  }

  /**
   * Returns an absolute path (i.e. a path containing the complete path to file)
   * @param  {String} p The path to be returned absolute
   * @return {String}   The absolute path.
   */
  _makeAbsolute (p) {
    if (!this._isAbsolute(p)) {
      return path.join(this.getRootPath(), p)
    }

    return p
  }

  /**
   * Whether or not the path is absolute (i.e. contains the root string's path)
   * @param  {String}  p The path to checked
   * @return {Boolean}   True, if the path contains the root directory's path
   */
  _isAbsolute (p) {
    if (p.indexOf(this.getRootPath()) === 0) {
      return true
    }

    return false
  }

  /**
   * Returns the containing ZettlrDir's path
   * @return {String} The containing directory's path
   */
  getRootPath () {
    return this.parent.path
  }
}

module.exports = ZettlrVirtualDirectory
