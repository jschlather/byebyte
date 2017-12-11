var fs = require( 'fs' );
var path = require('path');
var util = require('../util');

var api = module.exports = {
    command: 'destroy',
    desc: 'overwrite file with random data',
    builder: function (yargs) {
        var options = {
            times: {
                alias: 't',
                describe: 'the number of times to corrupt a random byte in the file',
                type: 'number'
            },
	    discrete: {
		alias: 'd',
		describe: 'if turned on will cause the corruptions to be spaced evenly over the length of the file. Cannot be used with continuous.',
		'default': false,
		type: 'boolean'
	    },
            continuous: {
                alias: 'c',
                describe: 'whether or not to randomly continue corrupting the next piece of data',
                'default': false,
                type: 'boolean'
            },
            'continuous-chance': {
                alias: 'C',
                describe: 'the percent chance from 0 - 1 (0.1 = 10%, 1 = 100%) to continue corrupting the immediate next byte after the last byte instead of corrupting a random next byte',
                'default': 0.6,
                type: 'number'
            }
        };

        return yargs.options(options)
            .example('$0 destroy --min 0.3 --max 0.8 --input file.jpg --output file_byebyte.jpg');
    },
    handler: function (argv) {
        var continuous = argv.c || argv.continuous;
        var continuousChance = argv.C || argv.continuousChance || 0.6;
	var discrete = argv.u || argv.discrete

        var times = argv.t || argv.times || 50;
        var filepath = argv.i || argv.input;
        var out = argv.o || argv.output;
        var fileBuffer = fs.readFileSync( path.resolve( process.cwd(), filepath ) );
        var len = fileBuffer.length;
        var startStop = util.determineModificationRange(argv, len);
        var start = startStop.start;
        var stop = startStop.stop;
        console.log( "File length: " + len );
        console.log( "Randomly assigning hex values within bytes " + start + " and " + stop);

        fileBuffer = api.fn(fileBuffer, {
          times: times,
          start: start,
          stop: stop,
          continuous: continuous,
          continuousChance: continuousChance,
	  discrete: discrete
        });

        fs.writeFileSync( path.resolve( process.cwd(), out ), fileBuffer );
        console.log( 'Replaced ' + times + ' byte(s) with trash and exported to ' + out + '.' );
    },
    fn: function(fileBuffer, opts) {
        var getRandomInt = opts.getRandomInt || util.getRandomInt;
        var continuous = opts.continuous || false;
        var continuousChance = opts.continuousChance || 0.6;
        var times = opts.times || 50;
	var discrete = opts.discrete || false;

	if(discrete && continuous) {
	    throw new Error('Discrete and continuous may not be used together.');
	}
	
        var len = fileBuffer.length;

        util.checkGeneralLength(opts, len);

        var terms = opts.min !== undefined ? ['min', 'max'] : ['start', 'stop'];
        var startStop = util.determineModificationRange(opts, len);
        var start = startStop.start;
        var stop = startStop.stop;
        if (start > stop) {
          throw new Error(`${terms[0]} must be smaller than ${terms[1]}`);
        }
	var lengthOfRange = stop - start;

        var offset = discrete ? start : getRandomInt(start, stop);
	
        for (var i = 0; i < times; i++) {
            fileBuffer[ offset ] = getRandomInt(1, 255);

            // If we have continuous set to true, and trying to continue would
            // not run off the range of the buffer, we continue on to the next
            // pixel slot to override if we beat our continuousChance. If not,
            // we go to a random place within our range.
            if (continuous && (offset + 1 <= len) && !discrete) {
                if ((continuousChance > Math.random()) && (offset + 1 <= stop)) {
                    offset++;
                } else {
                    offset = getRandomInt(start, stop);
                }
            } else if(discrete) {
		offset += ((stop - start) / times) | 0;
		console.log('new offset' + offset);
	    }
	    else {
                offset = getRandomInt(start, stop);
            }
        }

        return fileBuffer;
      
    }
};
