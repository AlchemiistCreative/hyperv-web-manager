const Shell = require('node-powershell');
const bodyparser = require('body-parser');
const express = require('express');
const session = require('express-session');
const removeEmptyLines = require("remove-blank-lines");
const bcrypt = require('bcrypt');
const ActiveDirectory = require('activedirectory');


const ps = new Shell({
  executionPolicy: 'Bypass',
  noProfile: true
});

//SQL Config
let connection = require('./config/db');

function default_sql_setup(){

let Default = require('./config/default_db_setup')

Default();
}

default_sql_setup()

//Hyper-V
//initiate PSSession
var isConnected
var isRefreshed 
function pscon(cb){
  let CFG = require('./models/cfg');
  CFG.get_config((settings) => {
  
    if(settings[0].username === null || settings[0].username === ''){
      console.log("null")
    }else{
      let username  = settings[0].username
      let hostname = settings[0].hostname
      ps.addCommand(`$session = New-PSSession -HostName ${hostname} -UserName ${username}`);
      ps.invoke()
      .then(output => {
        //console.log("connected to host");
        isConnected = true
        cb();

      })
      .catch(err => {
        console.log(err);
      });
      
    }
  })
}
pscon(function(){

});
function sw(cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Get-VMSwitch | foreach { $_.Name }}`);
    ps.invoke()
    .then(output => {
      var lines = output.split("\n");
      for(var i = 0;i < lines.length;i++){
        let swname = lines[i]; 
        console.log(swname);
        if(swname === null || swname === undefined || swname === ''){
          //console.log("null");
        }else{
          connection.query('INSERT INTO switch SET switch = ? ON DUPLICATE KEY UPDATE switch = ?', [swname, swname], (err, result) => {
            if (err) throw err
        });

        }

    }
  
    cb();
    })
    .catch(err => {
      
    });
  }

}
function img(cb){

  if(isConnected){
    let CFG = require('./models/cfg');
    CFG.get_config((settings) => {
      if(settings[0].inventory_path === null || settings[0].inventory_path === ''){
        console.log("null")
      }else{
        
        let imgpath = settings[0].inventory_path
        console.log(imgpath)
        ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; dir ${imgpath}*.iso | foreach {$_.Name}}`);
        ps.invoke()
        .then(output => {
          //console.log(output);
          var lines = output.split("\n");
          for(var i = 0;i < lines.length;i++){
            let images = lines[i];
            if(images === null || images === undefined || images === ''){
              //console.log("null");
            }else{
              console.log(images);
              connection.query('INSERT INTO img SET images = ? ON DUPLICATE KEY UPDATE images = ?', [images, images], (err, result) => {
                if (err) throw err
            });
            }
        }
      
        cb();
        })
        .catch(err => {
          console.log(err);
        });
  
      }
    })

  }else{
    console.log("error")
  }
}
function da_vm(cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; get-vm | ft -HideTableHeaders  Name, State, CPUUsage, UPTIME, VMID  -AutoSize}`);
    ps.invoke()
    .then(output => {
      //console.log(output);
  
      let output_filtered = removeEmptyLines(output);
  
      var lines = output_filtered.split("\n");
      var arr = [];
      for(var i = 0;i < lines.length;i++){
     
        let VM = lines[i]; 
  
        let VM_array = VM.split(" ");
    
        let filtered = VM_array.filter(Boolean);
  
          if(filtered[4] === null || filtered[4] === undefined || filtered[4] === ''){
  
          }else{
            connection.query(`INSERT INTO VMS_UNIQUE SET VMNAME = ?, VMSTATE = ?, VMCPUUSAGE = ?, VMUPTIME = ?, VMID = ? ON DUPLICATE KEY UPDATE VMNAME = ?, VMSTATE = ?, VMCPUUSAGE = ?, VMUPTIME = ?`, [filtered[0], filtered[1], filtered[2], filtered[3], filtered[4],filtered[0], filtered[1], filtered[2], filtered[3]], (err, result) => {
              if (err) throw err
              
              });
              let VMID = filtered[4].substring(0, 8);

              arr.push(VMID);
          }
        }
        let CFG = require('./models/cfg');
        CFG.get_vms((vms) => {

          var arr2 = []
          for(vm of vms){
            arr2.push(vm.vm_id)
          }
          arr2.forEach(function(item) {
      
            if(arr.indexOf(item) !== -1){
              //console.log("in array: " + item);
      
            }else{
              //console.log("not in array: " + item);
              connection.query(`DELETE FROM VMS_UNIQUE WHERE VMID = ?`, [item], (err, result) => {
                if (err) throw err
                
              });
            }
          
          
          });
          arr2 = [];
          arr = [];
        })

    cb();
    })
    .catch(err => {
      console.log(err);
    });

  }

}
function delete_vm(name, cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; remove-vm ${name} -Force}`);
    ps.invoke()
    .then(output => {
      //console.log(output);
    cb();
    })
    .catch(err => {
      console.log(err);
    });

  }
 
 

}
function start_vm(name, cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Start-vm ${name}}`);
    ps.invoke()
    .then(output => {
      console.log(output);
    cb();
    })
    .catch(err => {
      console.log(err);
    });
  }


}
function stop_vm(name, cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Stop-vm ${name}}`);
    ps.invoke()
    .then(output => {
      console.log(output);
    cb();
    })
    .catch(err => {
      console.log(err);
    });
  }

}
function edit_vm(name, NewVMName, memory, core, vswitch, image, cb){
  if(isConnected){
    
    let CFG = require('./models/cfg');

    CFG.get_config((config) => {
      if(config[0].inventory_path === null || config[0].inventory_path === ''){

      }else{
        let image_ = image || undefined
        let vswitch_ = vswitch || undefined

        let imagepath = config[0].inventory_path
        //Editing Name
        if(NewVMName !== null || NewVMName !== '' || NewVMName !== name || NewVMName !== undefined){
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VM -Name ${name} -NewVMName ${NewVMName}}`);
        
          if(image_ === null || image_ === "0" || image_ === undefined || image_ === ""){
            console.log("image: " + image_)
          }else{
            ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VMDvdDrive -VMName ${NewVMName} -Path ${imagepath}${image}}`);
          }

          if(vswitch_ === null || vswitch_ === "0" || vswitch_ === undefined || vswitch_ === ""){
            // console.log("vswitch_: " + vswitch_)
          }else{
            ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Connect-VMNetworkAdapter -VMName ${NewVMName} -SwitchName "${vswitch}"}`);
          }
          if(memory !== null || memory !== '' || memory !== undefined){
            ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VM -Name ${NewVMName} -MemoryStartupBytes ${memory}MB}`);
          }
          if(core !== null || core !== '' || core !== undefined){
            ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VM -Name ${NewVMName} -ProcessorCount ${core}}`);
          }
          
        }else{
        //Editing anyting else
        if(image_ === null || image_ === "0" || image_ === undefined || image_ === ""){
          // console.log("image: " + image_)
        }else{
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VMDvdDrive -VMName ${name} -Path ${imagepath}${image}}`);
        }

        if(vswitch_ === null || vswitch_ === "0" || vswitch_ === undefined || vswitch_ === ""){
          console.log("vswitch_: " + vswitch_)
        }else{
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Connect-VMNetworkAdapter -VMName ${name} -SwitchName "${vswitch}"}`);
        }
        if(memory !== null || memory !== '' || memory !== undefined){
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VM -Name ${name} -MemoryStartupBytes ${memory}MB}`);
        }
        if(core !== null || core !== '' || core !== undefined){
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; Set-VM -Name ${name} -ProcessorCount ${core}}`);
        }

        }
        ps.invoke()
        .then(output => {
          da_vm(function(){
            vm_info(function(){
              cb();
             });
          });
       
        })
        .catch(err => {
          let error = err.toString();
          connection.query('INSERT INTO logs SET logs = ?, created_time = NOW()', [error], (err, result) => {
            if (err) throw err
    
          });
        });

      }

    })

    }


}
function vm_info(cb){
  if(isConnected){
    ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'; get-vm | ft -HideTableHeaders  MEMORYSTARTUP, ProcessorCount,VMID  -AutoSize}`);
   
    
    ps.invoke()
    .then(output => {
      //console.log(output);
  
      let output_filtered = removeEmptyLines(output);
  
      var lines = output_filtered.split("\n");
      for(var i = 0;i < lines.length;i++){
     
        let VM = lines[i]; 
  
        let VM_array = VM.split(" ");
      
        let filtered = VM_array.filter(Boolean);
        
        
        if(filtered[2] === null || filtered[2] === undefined || filtered[2] === ''){
          
            //console.log("null");
  
          }else{
            let VMID = filtered[2].substring(0, 8);
            
            let memory = filtered[0] / (1024*1024)
            let memory_ = Math.trunc(memory)
            connection.query(`UPDATE VMS_UNIQUE SET MEMORYSTARTUP = ?, CPU = ? WHERE VMID = ?`, [memory_, filtered[1], VMID], (err, result) => {
              if (err) throw err
              
              });
  
          }
        }
        
    cb();
    })
    .catch(err => {
      console.log(err);
    });

  }
}

// Express JS
const app = express(); 
app.use(express.static('public'));
app.use(bodyparser.urlencoded({extended: false}));
app.use(bodyparser.json());
app.use(session({
  secret: 'oui',
  resave: true,
  saveUninitialized: true,
}));
app.use(express.json());
app.use(require('./middlewares/flash'));
app.set('view engine', 'ejs');

//Routes
app.get('/', (req, res) => {
  res.render('home', {IsLoggedIn: req.session.loggedin});
})
app.post('/auth-ldap', async (req,res) => {

  let CFG = require('./models/cfg');
  CFG.get_config((settings) => {

  if(settings[0].ldap_url === null || settings[0].base_dn === null || settings[0].ldap_url === undefined || settings[0].base_dn === undefined){
    req.flash('error', 'Wrong LDAP credentials');
    res.redirect('/');
    console.log("ldap null")
  }else{
    var config = {
      url: settings[0].ldap_url,
      baseDN: settings[0].base_dn
  };
  var ad = new ActiveDirectory(config);
  var username = req.body.username;
  var password = req.body.password;
  // Authenticate
  ad.authenticate(username, password, function(err, auth) {
      if (err) {
          console.log('ERROR: '+JSON.stringify(err));
          return;
      }
      if (auth) {
          console.log('Authenticated!');
          req.session.loggedin = true;
          req.session.username = username;
          res.redirect('/dashboard');
      }
      else {
          console.log('Authentication failed!');
      }
  });

  }







  })




})
app.post('/auth-basic', (req,res) => {
  const username = req.body.username_basic;
  const password = req.body.password_basic;

  if (username && password) {
    connection.query('SELECT password FROM users WHERE username = ?', [username], 
      (error, results, fields)=> {
      if(error){
        
        
        req.flash('error', 'Wrong credentials');
        res.redirect('/')
      }  
      else if (results.length==0){
        
     
        req.flash('error', 'Wrong credentials');
        res.redirect('/')
      }
      else{
        var user = results[0]

        if (bcrypt.compareSync(password, user.password)) {

          req.flash('success', 'Logged In');
          console.log('Authenticated!');
          req.session.loggedin = true;
          req.session.username = username;
          res.redirect('/dashboard');
      } else {
      
          req.flash('error', 'Wrong credentials');
          res.redirect('/')
      }           
        
      }
     
    });
  } 
  else {
    req.flash('error', 'Wrong credentials');
    res.redirect('/')
  }

})
app.get('/logout', (req, res) => {
  if (req.session.loggedin) {
    req.flash('success', 'Logged Out');
    console.log('Logged out!');
    req.session.loggedin = false;

    res.redirect('/');

} else {
  req.flash('error', 'What are you trying to do?');
  res.redirect('/')


}
})
app.get('/dashboard', (req, res) => {
  if (req.session.loggedin) {

  let CFG = require('./models/cfg');
  CFG.get_img((imgs) => {
    CFG.get_sw((switchs) => {
      CFG.get_vms((vms) => {

      res.render('index', {switchs: switchs, imgs: imgs, vms: vms, IsLoggedIn: req.session.loggedin, isRefreshed: isRefreshed});
  
      })
    })
  })
} else {
  req.flash('error', 'What are you trying to do?');
  res.redirect('/')

}
})
app.get('/on', (req, res) => {

  if (req.session.loggedin) {
    da_vm(function(){

      console.log("ok");
      res.redirect('/');
    });

  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
})
app.get('/deployment', (req, res) => {
  if (req.session.loggedin) {
  let SW = require('./models/cfg');
  SW.get_img((imgs) => {

    SW.get_sw((switchs) => {

      res.render('deployment', {switchs: switchs, imgs: imgs, IsLoggedIn: req.session.loggedin});
  
  
    })


  })
} else {
  req.flash('error', 'What are you trying to do?');
  res.redirect('/')

}
})
app.get('/logs', (req, res) => {
  if (req.session.loggedin) {
  let LOGS = require('./models/cfg');

  LOGS.get_logs((logs) => {

      res.render('logs', {logs: logs, IsLoggedIn: req.session.loggedin});

    })

  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
}) 
app.get('/settings', (req, res) => {
  if (req.session.loggedin) {
    let CFG = require('./models/cfg');

      CFG.get_config((config) => {
  
        res.render('settings', {config: config, IsLoggedIn: req.session.loggedin});
    
      })

    
  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }

})
app.post('/settings/config', (req, res) => {
      if (req.session.loggedin) {
        
          let username = req.body.hv_username
          let hostname = req.body.hostname

          let CFG = require('./models/cfg');


          if(username === null || username === '' || username === undefined || hostname === null || hostname === '' || hostname === undefined){
            req.flash('error', 'Username or Hostname is blank');
            res.redirect('/settings')
          }else{
            CFG.add_config(username, hostname,  () => {
              pscon(function(){
                req.flash('success', 'Succesfully connected to the host');
                res.redirect('/settings')
              });
  
            })
          }

          


      } else {
        req.flash('error', 'What are you trying to do?');
        res.redirect('/')
      }
    
})
app.post('/settings/add-interval', (req, res) => {
  if (req.session.loggedin) {
    
      let interval = req.body.refresh_interval


      let CFG = require('./models/cfg');


      if(interval === null || interval === '' || interval === undefined){
        req.flash('error', 'Interval is blank');
        res.redirect('/settings')
      }else{
        CFG.add_interval(interval,  () => {
          pscon(function(){
            req.flash('success', 'Interval succesfully added.');
            res.redirect('/settings')
          });

        })
      }

      


  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')
  }

})
app.post('/settings/auth', (req, res) => {
  if (req.session.loggedin) {
    
    let username = req.body.username
    let password = req.body.password
    let password_2 = req.body.password_2
    if(password === password_2){

      let hashedPassword = bcrypt.hashSync(password, 10);
      let CFG = require('./models/cfg');
  
      CFG.add_credentials(username, hashedPassword, () => {
  
  
          req.flash('success', 'New credentials succesfully added.');
          res.redirect('/settings')
  
      
      })

    }


  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }

})
app.post('/settings/inventory', (req, res) => {
  if (req.session.loggedin) {
    
    let inventory_path = req.body.inventory_path
    let vhd_path = req.body.vhd_path
      let CFG = require('./models/cfg');
  
      CFG.add_inventory_path(inventory_path,vhd_path, () => {
  
  
          req.flash('success', 'Inventory path succesfully added.');
          res.redirect('/settings')
  
      
      })


  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }

})
app.post('/settings/ldap', (req, res) => {
  if (req.session.loggedin) {
    
    let ldap_url = req.body.ldap_url
    let base_dn = req.body.base_dn
      let CFG = require('./models/cfg');
  
      CFG.add_ldap(ldap_url,base_dn, () => {
  
  
          req.flash('success', 'Ldap settings succesfully added.');
          res.redirect('/settings')
  
      
      })


  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }

})
app.get('/refreshsw', (req, res) => {
  if (req.session.loggedin) {
 sw(function(){

  console.log('refreshed');
  req.flash('success', 'Refreshed');
  res.redirect('/settings');

 });
} else {
  req.flash('error', 'What are you trying to do?');
  res.redirect('/')


}
})
app.get('/clearlogs', (req, res) => {
  if (req.session.loggedin) {
  connection.query('DELETE FROM logs', (err, result) => {
    if (err) throw err
    res.redirect('/logs');
  });
} else {
  req.flash('error', 'What are you trying to do?');
  res.redirect('/')


}
})
app.get('/refreshimg', (req, res) => {
  if (req.session.loggedin) {
  img(function(){

    console.log('refreshed');
    req.flash('success', 'Refreshed');
    res.redirect('/settings');
  
   });
  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
})
app.get('/delete/:name', (req, res) => {
  if (req.session.loggedin) {
  var name = req.params.name
  delete_vm(name, function(){

    let CFG = require('./models/cfg');
    CFG.delete(name, function(){
      req.flash('success', 'VM Succesfully deleted.');
      res.redirect('/dashboard')
    })
  
   });
  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
})
app.get('/stop/:name', (req, res) => {
  if (req.session.loggedin) {
  var name = req.params.name
 stop_vm(name, function(){

      req.flash('success', 'VM Succesfully stopped.');
      res.redirect('/')

  
   });
  } else {
    req.flash('error', 'What are you trying to do?');

    res.redirect('/')
  
  }
})
app.get('/start/:name', (req, res) => {
  if (req.session.loggedin) {
  var name = req.params.name
  start_vm(name, function(){
      req.flash('success', 'VM Succesfully started.');
      res.redirect('/')
   });
  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')
  }
})
app.post('/new-vm', (req, res) => {
    if (req.session.loggedin) {

    let CFG = require('./models/cfg');
    CFG.get_config((settings) => {

      if(settings[0].vhd_path === null || settings[0].inventory_path === null || settings[0].vhd_path === undefined || settings[0].inventory_path === undefined || settings[0].vhd_path === '' || settings[0].inventory_path === ''){
        req.flash('error', 'VHD Path or/and Image path need to be specified in settings.');
        res.redirect('/deployment');
      }else{
        let name = req.body.name
        let memory = req.body.memory
        let vswitch = req.body.vswitch
        let core = req.body.core
        let vhdpath = settings[0].vhd_path
        let vhdsize = req.body.vhdsize
        let image = req.body.image
        let imagepath = settings[0].inventory_path
        let NeedtoRun = req.body.needtorun


    
        if(req.body.name === undefined || req.body.name === ''){
          req.flash('error', 'You didnt specified a VM name.');
          res.redirect('/deployment');
        }else{
    
          if(req.body.vswitch === undefined || req.body.vswitch === ''){
            req.flash('error', 'You didnt specified a v-switch.');
            res.redirect('/deployment');
          }
          if(req.body.image === undefined || req.body.image === ''){
            req.flash('error', 'You didnt specified an image.');
            res.redirect('/deployment');
          }
          ps.addCommand(`Invoke-Command $session -ScriptBlock {$ProgressPreference = 'SilentlyContinue'}`);
          ps.addCommand(`Invoke-Command $session -ScriptBlock {New-VM -Name ${name} -MemoryStartupBytes ${memory}MB -SwitchName "${vswitch}"; Set-VM ${name} -ProcessorCount ${core}}`);
          ps.addCommand(`Invoke-Command $session -ScriptBlock {New-VHD -Path "${vhdpath}${name}.vhdx" -SizeBytes ${vhdsize}MB; Add-VMHardDiskDrive -VMName ${name} -Path "${vhdpath}${name}.vhdx"}`);
          ps.addCommand(`Invoke-Command $session -ScriptBlock {Set-VMDvdDrive -VMName ${name} -Path ${imagepath}${image}}`);
          if(NeedtoRun === 'true'){
            ps.addCommand(`Invoke-Command $session -ScriptBlock {Start-VM ${name}}`);
          }
          

          ps.invoke()
          .then(output => {
            console.log(output);
            if(NeedtoRun === 'true'){
              req.flash('success', 'VM Succesfully Started');
            }else{
              req.flash('success', 'VM Succesfully Created');
            }
            res.redirect('/deployment');
      
          })
          .catch(err => {
            console.log(err);
            let error = err.toString();
            connection.query('INSERT INTO logs SET logs = ?, created_time = NOW()', [error], (err, result) => {
              if (err) throw err
      
            });
            req.flash('error', 'VM Not Started due to error, please check logs.');
            res.redirect('/deployment');
          });
        }
  
      }

    })

  } else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
})
app.post('/edit-vm/:name', (req, res) => {
  if (req.session.loggedin) {
  let name = req.params.name
  let NewVMName = req.body.name
  let memory = req.body.memory
  let vswitch = req.body.vswitch
  let core = req.body.core
  let image = req.body.image

  edit_vm(name,NewVMName,memory, core, vswitch, image, function(){
    req.flash('success', 'VM Succesfully edited.');
    res.redirect('/dashboard');
  })


} else {
    req.flash('error', 'What are you trying to do?');
    res.redirect('/')

  
  }
})

function loop(){
  let CFG = require('./models/cfg');
  CFG.get_config((settings) => {


      var daVMLoop = setInterval(function(){
        da_vm(function(){
          vm_info(function(){
            isRefreshed = true;
          });
        });
      }, settings[0].refresh_interval * 1000);
  
    })

}

loop();
app.listen('5000');
