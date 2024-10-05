import { useEffect, useState } from "react";
import AceEditor from "react-ace";
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate, useParams } from "react-router-dom";
import { generateColor } from "../../utils";
import './Room.css'

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";

import "ace-builds/src-noconflict/keybinding-emacs";
import "ace-builds/src-noconflict/keybinding-vim";

import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";

export default function Room({ socket }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [fetchedUsers, setFetchedUsers] = useState(() => [])
  const [fetchedCode, setFetchedCode] = useState(() => "")
  const [language, setLanguage] = useState(() => "javascript")
  const [codeKeybinding, setCodeKeybinding] = useState(() => undefined)
  const [currentEditor, setCurrentEditor] = useState(null) // New state for current editor
  const [socketID_to_Users_Map, setSocketIDToUsersMap] = useState({}); // Initialize as an empty object



  const languagesAvailable = ["javascript", "java", "c_cpp", "python", "typescript", "golang", "yaml", "html"]
  const codeKeybindingsAvailable = ["default", "emacs", "vim"]

  function onChange(newValue) {
    setFetchedCode(newValue)
    socket.emit("update code", { roomId, code: newValue })
    socket.emit("syncing the code", { roomId: roomId })
  }

  function handleLanguageChange(e) {
    setLanguage(e.target.value)
    socket.emit("update language", { roomId, languageUsed: e.target.value })
    socket.emit("syncing the language", { roomId: roomId })
  }

  function handleCodeKeybindingChange(e) {
    setCodeKeybinding(e.target.value === "default" ? undefined : e.target.value)
  }

  function handleLeave() {
    socket.disconnect()
    !socket.connected && navigate('/', { replace: true, state: {} })
  }

  function copyToClipboard(text) {
    try {
      navigator.clipboard.writeText(text);
      toast.success('Room ID copied')
    } catch (exp) {
      console.error(exp)
    }
  }

  // Function to download the code
  function downloadCode() {
    let extension;
    
    // Define the correct file extension based on the selected language
    switch (language) {
      case "python":
        extension = "py";
        break;
      case "javascript":
        extension = "js";
        break;
      case "typescript":
        extension = "ts";
        break;
      case "java":
        extension = "java";
        break;
      case "c_cpp":
        extension = "cpp";
        break;
      case "html":
        extension = "html";
        break;
      case "css":
        extension = "css";
        break;
      case "yaml":
        extension = "yaml";
        break;
      case "golang":
        extension = "go";
        break;
      default:
        extension = "txt"; // Default to plain text if no match
    }
  
    // Create the blob and trigger download
    const blob = new Blob([fetchedCode], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `code_${roomId}.${extension}`; // Add the correct extension
    link.click();
  }
  

  useEffect(() => {
    socket.on("updating client list", ({ userslist }) => {
      // Create the mapping from socket ID to username
      const map = {};
      userslist.forEach(user => {
          map[user.socketId] = user.username; // Adjust this based on your actual user object structure
      });
      setSocketIDToUsersMap(map);
      setFetchedUsers(userslist)
    })

    socket.on("on language change", ({ languageUsed }) => {
      setLanguage(languageUsed)
    })

    socket.on("on code change", ({ code }) => {
      setFetchedCode(code)
    })

    socket.on("new member joined", ({ username }) => {
      toast(`${username} joined`)
    })

    socket.on("user editing", ({ username }) => {
      setCurrentEditor(username);
    });

    socket.on("user stopped editing", () => {
      setCurrentEditor(null);
    });

    socket.on("member left", ({ username }) => {
      toast(`${username} left`)
    })

    const backButtonEventListner = window.addEventListener("popstate", function (e) {
      const eventStateObj = e.state
      if (!('usr' in eventStateObj) || !('username' in eventStateObj.usr)) {
        socket.disconnect()
      }
    });

    return () => {
      window.removeEventListener("popstate", backButtonEventListner)
    }
  }, [socket])


  function onEditorFocus() {
    const user = socketID_to_Users_Map[socket.id]; // Get user info from your mapping
    const username = user ? user.username : socket.id; // Fallback to socket.id if username is not found
    socket.emit('start editing', { roomId, username });
  }

  // Emit stop editing event
  function onEditorBlur() {
    // console.log(`${socket.username} stopped editing`);
    socket.emit('stop editing', { roomId })
  }

  return (
    <div className="room">
      <div className="roomSidebar">
        <div className="roomSidebarUsersWrapper">
          <div className="languageFieldWrapper">
            <select className="languageField" name="language" id="language" value={language} onChange={handleLanguageChange}>
              {languagesAvailable.map(eachLanguage => (
                <option key={eachLanguage} value={eachLanguage}>{eachLanguage}</option>
              ))}
            </select>
          </div>

          <div className="languageFieldWrapper">
            <select className="languageField" name="codeKeybinding" id="codeKeybinding" value={codeKeybinding} onChange={handleCodeKeybindingChange}>
              {codeKeybindingsAvailable.map(eachKeybinding => (
                <option key={eachKeybinding} value={eachKeybinding}>{eachKeybinding}</option>
              ))}
            </select>
          </div>

          <p>Connected Users:</p>
          <div className="roomSidebarUsers">
            {fetchedUsers.map((each) => (
              <div key={each} className="roomSidebarUsersEach">
                <div className="roomSidebarUsersEachAvatar" style={{ backgroundColor: `${generateColor(each)}` }}>{each.slice(0, 2).toUpperCase()}</div>
                <div className="roomSidebarUsersEachName">{each}</div>
              </div>
            ))}
          </div>

          {/* {currentEditor && ( // Display who is editing
            <div className="roomSidebarEditing">
              {currentEditor} is editing...
            </div>
          )} */}
          <p>Currently Editing: {currentEditor ? currentEditor : 'None'}</p>
        </div>

        <button className="roomSidebarCopyBtn" onClick={() => { copyToClipboard(roomId) }}>Copy Room id</button>
        <button className="roomSidebarDownloadBtn" onClick={downloadCode}>Download Code</button> {/* New Download Button */}
        <button className="roomSidebarBtn" onClick={() => {
          handleLeave()
        }}>Leave</button>
      </div>

      <AceEditor
        placeholder="Write your code here."
        className="roomCodeEditor"
        mode={language}
        keyboardHandler={codeKeybinding}
        theme="monokai"
        name="collabEditor"
        width="auto"
        height="auto"
        value={fetchedCode}
        onChange={onChange}
        onFocus={onEditorFocus} // Add this line
        onBlur={onEditorBlur}   // Add this line
        fontSize={15}
        showPrintMargin={true}
        showGutter={true}
        highlightActiveLine={true}
        enableLiveAutocompletion={true}
        enableBasicAutocompletion={false}
        enableSnippets={false}
        wrapEnabled={true}
        tabSize={2}
        editorProps={{
          $blockScrolling: true
        }}
      />
      <Toaster />
    </div>
  )
}