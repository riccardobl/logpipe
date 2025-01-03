/**
 * A service that can be attached to an express app to serve specific routes
 */
import express from 'express'

export interface Service {
    attach(app:  express.Express): void;
}