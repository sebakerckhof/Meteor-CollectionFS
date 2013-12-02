cfs-s3
=========================

NOTE: This branch is under active development right now (2013-11-18). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds Amazon S3 storage for [CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS).

## Installation

NOTE: Until this is added to atmosphere, use this in smart.json:

```js
"cfs-s3": {
  "git": "https://github.com/CollectionFS/Meteor-cfs-s3.git",
  "branch": "master"
}
```

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add cfs-s3
```

## Usage

1. Create a new bucket in S3. We'll refer to this as `mybucket`.
2. If desired, create an IAM policy specific to allowing this app access to this bucket.
3. Use when constructing an FS.Collection, like this:

```js
Images = new FS.Collection("images", {
  store: new FS.S3Store("images", {
           region: "my-s3-region", //required
           key: "account or IAM key", //required
           secret: "account or IAM secret", //required
           bucket: "mybucket", //required
           'x-amz-acl': myValue //default is 'public-read'
         });
});
```

## Notes

An S3Store does not support the `sync` option.