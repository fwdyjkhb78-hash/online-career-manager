/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "owner",
      "staff_mercato",
      "staff_annonces",
      "staff_championnat",
      "staff_developpement",
      "staff_formation",
      "user"
    ]
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1629030962",
    "max": 0,
    "min": 0,
    "name": "club_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text988525798",
    "max": 0,
    "min": 0,
    "name": "club_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1404324205",
    "name": "has_selected_club",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(14, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text846843460",
    "max": 0,
    "min": 0,
    "name": "last_seen",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(15, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text2261535133",
    "max": 0,
    "min": 0,
    "name": "pseudo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(16, new Field({
    "help": "",
    "hidden": false,
    "id": "date2917779566",
    "max": "",
    "min": "",
    "name": "created_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "help": "",
    "hidden": false,
    "id": "date4183970445",
    "max": "",
    "min": "",
    "name": "updated_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3687080900",
    "max": 0,
    "min": 0,
    "name": "full_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text237961472",
    "max": 0,
    "min": 0,
    "name": "ea_pseudo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(20, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text4133676994",
    "max": 0,
    "min": 0,
    "name": "site_pseudo",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1775879412",
    "name": "intro_submitted",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove field
  collection.fields.removeById("select1466534506")

  // remove field
  collection.fields.removeById("text1629030962")

  // remove field
  collection.fields.removeById("text988525798")

  // remove field
  collection.fields.removeById("bool1404324205")

  // remove field
  collection.fields.removeById("text846843460")

  // remove field
  collection.fields.removeById("text2261535133")

  // remove field
  collection.fields.removeById("date2917779566")

  // remove field
  collection.fields.removeById("date4183970445")

  // remove field
  collection.fields.removeById("text3687080900")

  // remove field
  collection.fields.removeById("text237961472")

  // remove field
  collection.fields.removeById("text4133676994")

  // remove field
  collection.fields.removeById("bool1775879412")

  return app.save(collection)
})
