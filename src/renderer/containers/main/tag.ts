
/* IMPORT */

import * as _ from 'lodash';
import {Container} from 'overstated';
import Tags, {TagSpecials} from '@renderer/utils/tags';
import Utils from '@renderer/utils/utils';

const {SEPARATOR} = Tags;
const {DEFAULT, ALL, FAVORITES, NOTEBOOKS, TAGS, TEMPLATES, UNTAGGED, TRASH} = TagSpecials;

/* TAG */

class Tag extends Container<TagState, MainCTX> {

  /* STATE */

  state = {
    tag: DEFAULT
  };

  /* API */

  add = async ( tag: TagObj ) => {

    const tags = _.clone ( this.ctx.tags.get () ),
          parentParts = tag.path.split ( SEPARATOR ).slice ( 0, -1 ),
          parent = parentParts.reduce ( ( acc, tag ) => acc.tags && ( acc.tags[tag] = _.clone ( acc.tags[tag] ) ) || {}, {tags} ); // It's important to clone the parents too

    if ( !_.isEmpty ( parent ) ) {

      parent.tags[tag.name] = tag;

      await this.ctx.tags.set ( tags );

    }

  }

  delete = async ( tag: TagObj ) => {

    const tags = _.clone ( this.ctx.tags.get () ),
          parentParts = tag.path.split ( SEPARATOR ).slice ( 0, -1 ),
          parent = parentParts.reduce ( ( acc, tag ) => acc.tags && ( acc.tags[tag] = _.clone ( acc.tags[tag] ) ) || {}, {tags} );

    if ( !_.isEmpty ( parent ) ) {

      delete parent.tags[tag.name];

      await this.ctx.tags.set ( tags );

    }

  }

  get = ( tag: string = this.state.tag ): TagObj | undefined => {

    const tags = tag.split ( SEPARATOR ),
          obj = tags.reduce ( ( acc, tag ) => acc.tags && acc.tags[tag] || {}, { tags: this.ctx.tags.get () } );

    return _.isEmpty ( obj ) ? undefined : obj as TagObj;

  }

  getNotes = ( tag: string = this.state.tag ): NoteObj[] => {

    const obj = this.get ( tag );

    return obj && obj.notes || [];

  }

  getTags = ( tag: string = this.state.tag ): TagsObj => {

    const obj = this.get ( tag );

    return obj && obj.tags || {};

  }

  hasChildren = ( tag: string = this.state.tag ): boolean => {

    return !!Object.keys ( this.getTags ( tag ) ).length;

  }

  isCollapsed = ( tag: string = this.state.tag ): boolean => {

    const obj = this.get ( tag );

    return !!obj && !!obj.collapsed;

  }

  toggleCollapse = async ( tag: string = this.state.tag, force: boolean = !this.isCollapsed ( tag ) ) => {

    const obj = _.clone ( this.get ( tag ) );

    if ( !obj ) return;

    obj.collapsed = force;

    await this.replace ( obj, obj );

    if ( this.state.tag.startsWith ( `${tag}/` ) ) { // The current tag is inside a collapsed one

      await this.set ( tag );

    }

  }

  scrollTo = ( tag: string = this.state.tag ) => {

    if ( !tag ) return;

    Utils.scrollTo ( `.tag[data-tag="${tag}"]`, '.layout-content > .multiple > .tag, .layout-content > .multiple > .tag-group' );

  }

  set = async ( tag: string ) => {

    if ( !this.get ( tag ) ) tag = DEFAULT;

    await this.setState ({ tag });

    await this.ctx.search.update ();

    this.scrollTo ( tag );

    this.ctx.note.scrollTo ();

  }

  setFromNote = async ( note?: NoteObj ) => {

    const tag = this.state.tag,
          tags = this.ctx.note.getTags ( note );

    /* VALIDATING CURRENT */

    if ( tag === ALL ) return;
    if ( tag === FAVORITES && this.ctx.note.isFavorited () ) return;
    if ( tag === TAGS && tags.length ) return;
    if ( tag === UNTAGGED && !tags.length ) return;
    if ( tag === TRASH && this.ctx.note.isDeleted () ) return;
    if ( this.ctx.note.getTags ( note, tag ).length ) return;

    /* SETTING NEXT */

    if ( !note ) return this.set ( ALL );

    const tagsTemplates = this.ctx.note.getTags ( note, TEMPLATES );

    if ( tagsTemplates.length ) return this.set ( tagsTemplates[0] );

    const tagsNotebooks = this.ctx.note.getTags ( note, NOTEBOOKS );

    if ( tagsNotebooks.length ) return this.set ( tagsNotebooks[0] );

    if ( this.ctx.note.isFavorited ( note ) ) return this.set ( FAVORITES );

    if ( tags.length ) return this.set ( ALL );

    return this.set ( UNTAGGED );

  }

  replace = async ( tag: TagObj, nextTag: TagObj ) => {

    const isSameTag = ( tag.path === nextTag.path );

    if ( !isSameTag ) await this.delete ( tag );

    await this.add ( tag );

  }

  update = async () => {

    if ( this.get ( this.state.tag ) ) return;

    const tag = DEFAULT;

    await this.set ( tag );

    await this.ctx.note.update ();

  }

  navigate = ( modifier: number, wrap: boolean = true ) => {

    const $tags = $('#sidebar .tag');

    if ( !$tags.length ) return;

    const index = $tags.index ( '.tag.active' ) + modifier,
          indexWrapped = wrap ? ( $tags.length + index ) % $tags.length : index,
          tagNext = $tags.eq ( indexWrapped ).data ( 'tag' );

    if ( tagNext ) return this.ctx.tag.set ( tagNext );

    return; //TSC

  }

  previous = () => {

    return this.navigate ( -1 );

  }

  next = () => {

    return this.navigate ( 1 );

  }

}

/* EXPORT */

export default Tag;