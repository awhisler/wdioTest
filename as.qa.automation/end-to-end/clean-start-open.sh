#!/bin/sh
npm run report:endtoend:clean:results; npm run test:endtoend -- $@; npm run report:endtoend:open