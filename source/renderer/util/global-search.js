/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GlobalSearch class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the global search functionality.
 *
 * END HEADER
 */

class GlobalSearch {
  constructor (term) {
    let compiledTerms = this._compileSearchTerms(term)

    // Now we are all set and can begin the journey. First we need to prepare
    // some things. First: Write the current terms into this object
    // second, listen for search events and third clear everything up when
    // we are done.

    this._elements = []
    this._currentSearch = compiledTerms
    this._beforeSearchCallback = null
    this._afterSearchCallback = null

    // The search index will be increased BEFORE accessing the first file!
    this._currentSearchIndex = -1

    // Also, to prevent previous search results from showing up, remove them
    this._results = []
    this._maxWeight = -1
  }

  /**
   * Adds elements to the searchable array
   * @param  {Array} elements An array with new items
   * @return {GlobalSearch}   This for chainability
   */
  with (elements) {
    if (!Array.isArray(elements)) elements = [elements]
    this._elements = this._elements.concat(elements)
    return this
  }

  /**
   * Define a callback to be called for each element
   * @param  {Function} callback The callback to be called.
   * @return {GlobalSearch}            This for chainability
   */
  each (callback) {
    this._beforeSearchCallback = callback
    return this
  }

  /**
   * Adds a callback to be called after each search result has been processed.
   * @param  {Function} callback The provided callback
   * @return {GlobalSearch}            This for chainability.
   */
  afterEach (callback) {
    this._afterSearchCallback = callback
    return this
  }

  /**
   * Adds a callback to be called after the search is completed.
   * @param  {Function} callback The provided callback.
   * @return {GlobalSearch}            This for chainability.
   */
  then (callback) {
    this._afterCallback = callback
    return this
  }

  /**
   * Begins a search (if it has been correctly set up)
   * @return {GlobalSearch} This for chainability
   */
  start () {
    if (!this._currentSearch) throw new Error('Search not initialised!')
    // Aaaaand: Go!
    this._doSearch()

    return this
  }

  /**
    * Do one single search cycle.
    * @return {void} Nothing to return.
    */
  _doSearch () {
    if (this._elements.length === 0) {
      this.endSearch()
      return
    }

    if (this._currentSearchIndex >= (this._elements.length - 1)) {
      // End search
      this.endSearch()
      return
    }

    this._currentSearchIndex++

    // Now call the provided callback and handle the search result once it
    // arrives.
    this._beforeSearchCallback(
      this._elements[this._currentSearchIndex],
      this._currentSearch
    ).then((data) => {
      this.handleSearchResult(data)
    })
  }

  /**
    * Handle the result of the search from main process.
    * @param  {Object} res Contains the search result and the hash.
    * @return {void}     Nothing to return.
    */
  handleSearchResult (res) {
    if (res.result.length > 0) {
      this._results.push(res) // For later reference
      let w = 0
      for (let r of res.result) {
        w += r.weight
      }
      if (w > this._maxWeight) {
        this._maxWeight = w
      }
    }

    // If provided, call the appropriate callback
    if (this._afterSearchCallback) this._afterSearchCallback(this._currentSearchIndex, this._elements.length)

    // Next search cycle
    this._doSearch()
  }

  /**
    * Ends a search if there are no more elements to search through.
    * @return {void} Nothing to return.
    */
  endSearch () {
    this._currentSearchIndex = 0
    this._elements = []
    this._currentSearch = null

    if (this._afterCallback) this._afterCallback(this._results)
  }

  _compileSearchTerms (term) {
    // First sanitize the terms
    let myTerms = []
    let curWord = ''
    let hasExact = false
    let operator = 'AND'

    for (let i = 0; i < term.length; i++) {
      let c = term.charAt(i)
      if ((c === ' ') && !hasExact) {
        // Eat word and next
        if (curWord.trim() !== '') {
          myTerms.push({ 'word': curWord.trim(), 'operator': operator })
          curWord = ''
          if (operator === 'OR') {
            operator = 'AND'
          }
        }
        continue
      } else if (c === '|') {
        // We got an OR operator
        // So change the last word's operator and set current operator to OR
        operator = 'OR'
        // Take a look forward and if the next char is also a space, eat it right now
        if (term.charAt(i + 1) === ' ') {
          ++i
        }
        // Also the previous operator should also be set to or
        myTerms[myTerms.length - 1].operator = 'OR'
        continue
      } else if (c === '"') {
        if (!hasExact) {
          hasExact = true
          continue
        } else {
          hasExact = false
          myTerms.push({ 'word': curWord.trim(), 'operator': operator })
          curWord = ''
          if (operator === 'OR') {
            operator = 'AND'
          }
          continue
        }
        // Don't eat the quote;
      }

      curWord += term.charAt(i)
    }

    // Afterwards eat the last word if its not empty
    if (curWord.trim() !== '') {
      myTerms.push({ 'word': curWord.trim(), 'operator': operator })
    }

    // Now pack together all consecutive ORs
    // to make it easier for the search in the main process
    let currentOr = {}
    currentOr.operator = 'OR'
    currentOr.word = []
    let newTerms = []

    for (let i = 0; i < myTerms.length; i++) {
      if (myTerms[i].operator === 'AND') {
        if (currentOr.word.length > 0) {
          // Duplicate object so that the words are retained
          newTerms.push(JSON.parse(JSON.stringify(currentOr)))
          currentOr.word = []
        }
        newTerms.push(myTerms[i])
      } else if (myTerms[i].operator === 'OR') {
        currentOr.word.push(myTerms[i].word)
      }
    }

    // Now push the currentOr if not empty
    if (currentOr.word.length > 0) {
      newTerms.push(JSON.parse(JSON.stringify(currentOr)))
    }

    return newTerms
  }
}

module.exports = GlobalSearch
