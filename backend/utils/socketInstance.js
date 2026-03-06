/**
 * Socket Instance Singleton
 * Holds the global io reference so controllers can emit events
 * without creating circular dependencies.
 */

let _io = null;

export const setIo = (io) => {
  _io = io;
};

export const getIo = () => _io;
