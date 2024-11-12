import { Link } from "react-router-dom"

function Prototypes()
{
    return <div>
        <div><Link to={"/"}>Home</Link></div>
        <div><Link to={"/Prototype2"}>Prototype2</Link></div>
        <div><Link to={"/Prototype3"}>Prototype3</Link></div>
        <div><Link to={"/Prototype4"}>Prototype4</Link></div>
    </div>
}

export default Prototypes