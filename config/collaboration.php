<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sound Effects
    |--------------------------------------------------------------------------
    |
    | This determines whether or not the open sound effects are played when a
    | user joins or leaves a room.
    |
    */

    'sound_effects' => true,

    /*
    |--------------------------------------------------------------------------
    | Chat
    |--------------------------------------------------------------------------
    |
    | Per-entry chat that rides the same presence channel as the rest of the
    | collaboration features. Messages are sent via whispers and cached in
    | each user's localStorage — there is no server-side storage.
    |
    | history_limit caps the number of messages kept in localStorage per
    | channel (older messages are evicted FIFO).
    |
    | retention_days controls how long cached chat history for inactive
    | channels is kept in localStorage before being pruned.
    |
    */

    'chat' => [
        'enabled' => true,
        'history_limit' => 100,
        'retention_days' => 30,
    ],

];
