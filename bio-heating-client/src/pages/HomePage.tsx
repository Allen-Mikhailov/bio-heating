import { Link } from "react-router-dom"

function HomePage()
{
    return <div>
        <div><Link to={"/Prototype2"}>Prototype2</Link></div>
        <div><Link to={"/Prototype3"}>Prototype3</Link></div>
    </div>
}

export default HomePage