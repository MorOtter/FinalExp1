exports.startTrial = async (req, res, next) => {
    try {
        if (!req.session.condition) {
            return res.redirect('/');
        }
        
        // Retrieve experiment info
        
        const condition = req.session.condition;
        const group = req.session.groupName;
        const censorship = req.session.censoredInfo;
        let conditionText = '';
        const censoredArrayNumber = req.session.censoredArrayNumber;
        req.session.trialStartTime = new Date().toISOString();
        
        const packetArray = req.session.packetArray.map(x => x);
    
        // set condition text to be more user friendly
        switch (condition) {
        case "noAdvisor":
            conditionText = ""; 
            break;
        case "aiAdvisor":
            conditionText = "This is the recommendation of an A.I Expert";
            break;
        case "humanAdvisor":
            conditionText = "This is the recommendation of a human expert";
            break;
        default:
            conditionText = ''; // Default to no text
        }
        res.render('trial.ejs', { conditionText, group, censorship, censoredArrayNumber, packetArray: JSON.stringify(packetArray)})
    } catch (err) {
        console.error(err);
    }
}

exports.stopTrial = async (req, res, next) => {
    try {
        const trialEndTime = req.body["trialEndTime"];
        const trialType = req.session.trialNumber === 0 ? 'test' : 'main';
        const trialId = await req.dbServices.insertTrial(req.session.participantId, trialType, req.session.trialNumber, req.session.trialStartTime, trialEndTime);
        req.session.trialNumber++;

        for (let input of req.body["input"]) {
            input['time'] = input['time'] ? input['time'] : new Date().toISOString();
            await req.dbServices.insertPacket(trialId, input.user, input.advisor, input.accepted, input.time);
        }
        res.status(200).json({ message: 'Regular data received successfully' });

    } catch (err) {
        console.error("Error caught :",err);
    }
}

const zlib = require('zlib');


async function gzipDecompression(data) {
    
    const gunzip = zlib.createGunzip();

    let buffer = [];

    gunzip.on('data', (chunk) => { 
        buffer.push(chunk);
    })

    const decompressPromise = new Promise((resolve, reject) => {

        gunzip.on('end', () => {

            try {
                const decompressedBuffer = Buffer.concat(buffer); 
               
                const jsonData = JSON.parse(decompressedBuffer);
                resolve(jsonData);
            } catch (error) {
                reject(error)
            }
        });

        gunzip.on('error', (err) => {
            console.log(`Decompression Error: ${err}`)
            reject(err);
        });
    });

    gunzip.end(Buffer.from(data, 'base64'));
    return decompressPromise;
} 


exports.addGazeData = async (req, res, next) => {
    
    try {
        const decompressedData = await gzipDecompression(req.body.compressedGazeData);
        console.log(`type of data for decompressedData = ${typeof decompressedData}`);
        const trialId = await req.dbServices.getLastTrialId();

        for (let gazeData of decompressedData) {
            console.log(gazeData)
            // await req.dbServices.insertGazeData(trialId, parseFloat(gazeData.x), parseFloat(gazeData.y), gazeData.time);
        }

        res.status(200).json({ message: "Gaze Data stored" });
    } catch (err) {
        console.log("Error at the endpoint:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



