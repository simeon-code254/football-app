-- Extensions and shared enum types used across later migrations.

create extension if not exists pgcrypto;

create type position_code as enum (
  'GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST'
);
